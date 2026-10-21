using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text.Json;
using backend.Models;
using backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Configure CORS for Vite frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.SetIsOriginAllowed(origin => true) // Local development origins
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Register services
builder.Services.AddHttpClient();
builder.Services.AddHttpClient("YtMusicApiClient", client =>
{
    var timeout = builder.Configuration.GetValue<int>("YtMusicApi:TimeoutSeconds", 15);
    client.Timeout = TimeSpan.FromSeconds(timeout);
});

builder.Services.AddSingleton<ISearchProvider, YtMusicApiProvider>();
builder.Services.AddSingleton<ISearchProvider, YoutubeExplodeProvider>();
builder.Services.AddSingleton<ISearchProvider, InvidiousSearchProvider>();
builder.Services.AddSingleton<SearchProviderResolver>();
builder.Services.AddSingleton<AuthSyncStore>();

var app = builder.Build();

app.UseCors("CorsPolicy");

// Health check endpoint
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    timestamp = DateTime.UtcNow,
    framework = RuntimeInformation.FrameworkDescription,
    os = RuntimeInformation.OSDescription,
    service = "MusicFetcher.Backend",
    primaryProvider = "ytmusicapi"
}));

// Provider list endpoint
app.MapGet("/api/providers", (SearchProviderResolver resolver) =>
{
    var providers = resolver.GetAllProviders().Select(p => new ProviderInfoDto
    {
        Id = p.ProviderId,
        Name = p.DisplayName,
        Description = p.Description,
        IsDefault = p.ProviderId == "ytmusicapi",
        RequiresExternalInstance = p.RequiresExternalInstance
    });
    return Results.Ok(providers);
});

// Search endpoint with robust validation and error handling
app.MapGet("/api/search", async (
    string? q,
    string? provider,
    string? filter,
    int? limit,
    int? page,
    SearchProviderResolver resolver,
    IConfiguration config,
    ILogger<Program> logger,
    CancellationToken ct) =>
{
    // 1. Validation
    var validation = QueryValidator.Validate(q);
    if (!validation.IsValid)
    {
        return Results.BadRequest(new
        {
            error = validation.ErrorMessage,
            statusCode = StatusCodes.Status400BadRequest
        });
    }

    var sanitizedQuery = validation.SanitizedQuery!;
    var normalizedLimit = QueryValidator.NormalizeLimit(limit);
    var normalizedPage = QueryValidator.NormalizePage(page);

    // 2. Request Timeout bounds
    var timeoutSeconds = config.GetValue<int>("Search:TimeoutSeconds", 15);
    using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
    cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

    var sw = Stopwatch.StartNew();
    var selectedProvider = resolver.Resolve(provider);

    try
    {
        var response = await selectedProvider.SearchAsync(
            sanitizedQuery,
            normalizedLimit,
            normalizedPage,
            filter,
            cts.Token);

        return Results.Ok(response);
    }
    catch (OperationCanceledException)
    {
        sw.Stop();
        logger.LogWarning("Search request timed out after {Elapsed}ms for provider {Provider}",
            sw.ElapsedMilliseconds, selectedProvider.ProviderId);

        return Results.Json(new
        {
            error = $"Search request timed out after {timeoutSeconds}s. The service or upstream YouTube endpoint did not respond in time.",
            statusCode = StatusCodes.Status504GatewayTimeout,
            provider = selectedProvider.DisplayName,
            durationMs = sw.ElapsedMilliseconds
        }, statusCode: StatusCodes.Status504GatewayTimeout);
    }
    catch (Exception ex)
    {
        sw.Stop();
        logger.LogError(ex, "Search provider {Provider} threw an error", selectedProvider.ProviderId);

        return Results.Json(new
        {
            error = $"Search failed using {selectedProvider.DisplayName}: {ex.Message}",
            statusCode = StatusCodes.Status502BadGateway,
            provider = selectedProvider.DisplayName,
            durationMs = sw.ElapsedMilliseconds
        }, statusCode: StatusCodes.Status502BadGateway);
    }
});

// New releases endpoint
app.MapGet("/api/new_releases", async (
    int? limit,
    SearchProviderResolver resolver,
    CancellationToken ct) =>
{
    var provider = resolver.Resolve("ytmusicapi");
    var normalizedLimit = QueryValidator.NormalizeLimit(limit);
    var response = await provider.SearchAsync("new releases", normalizedLimit, 1, "new_releases", ct);
    return Results.Ok(response);
});

// Authentication: Send Phone OTP
app.MapPost("/api/auth/phone/send-otp", (JsonDocument body, AuthSyncStore store) =>
{
    var root = body.RootElement;
    if (!root.TryGetProperty("phoneNumber", out var phoneProp) || string.IsNullOrWhiteSpace(phoneProp.GetString()))
    {
        return Results.BadRequest(new { success = false, error = "Phone number is required." });
    }

    var phone = phoneProp.GetString()!;
    var code = store.CreatePhoneOtp(phone);

    return Results.Ok(new
    {
        success = true,
        message = $"Verification code sent to {phone}",
        phoneNumber = phone,
        otp = code,
        expiresInSeconds = 600
    });
});

// Authentication: Verify Phone OTP & Return Cloud Playlists + Likes
app.MapPost("/api/auth/phone/verify-otp", (JsonDocument body, AuthSyncStore store) =>
{
    var root = body.RootElement;
    var phone = root.TryGetProperty("phoneNumber", out var p) ? p.GetString() : null;
    var code = root.TryGetProperty("code", out var c) ? c.GetString() : null;

    if (string.IsNullOrWhiteSpace(phone) || string.IsNullOrWhiteSpace(code))
    {
        return Results.BadRequest(new { success = false, error = "Phone number and verification code are required." });
    }

    if (!store.VerifyPhoneOtp(phone, code, out var userEntry) || userEntry == null)
    {
        return Results.BadRequest(new { success = false, error = "Invalid or expired verification code." });
    }

    var profile = userEntry["profile"];
    var playlists = userEntry["playlists"];
    var likedTracks = userEntry["likedTracks"];
    var session = userEntry["playbackSession"];

    return Results.Ok(new
    {
        success = true,
        user = profile,
        token = $"token_phone_{Guid.NewGuid():N}",
        playlists = playlists ?? new System.Text.Json.Nodes.JsonArray(),
        likedTracks = likedTracks ?? new System.Text.Json.Nodes.JsonArray(),
        playbackSession = session
    });
});

// Authentication: Google Sign-In & Return Cloud Playlists + Likes
app.MapPost("/api/auth/google", (JsonDocument body, AuthSyncStore store) =>
{
    var root = body.RootElement;
    var email = root.TryGetProperty("email", out var e) ? e.GetString() : null;
    var name = root.TryGetProperty("name", out var n) ? n.GetString() : null;
    var photoUrl = root.TryGetProperty("photoUrl", out var p) ? p.GetString() : null;

    if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
    {
        return Results.BadRequest(new { success = false, error = "Valid Google email address is required." });
    }

    var userEntry = store.AuthenticateGoogle(email, name, photoUrl);
    var profile = userEntry["profile"];
    var playlists = userEntry["playlists"];
    var likedTracks = userEntry["likedTracks"];
    var session = userEntry["playbackSession"];

    return Results.Ok(new
    {
        success = true,
        user = profile,
        token = $"token_google_{Guid.NewGuid():N}",
        playlists = playlists ?? new System.Text.Json.Nodes.JsonArray(),
        likedTracks = likedTracks ?? new System.Text.Json.Nodes.JsonArray(),
        playbackSession = session
    });
});

// Authentication: X (Twitter) Sign-In & Return Cloud Playlists + Likes
app.MapPost("/api/auth/twitter", (JsonDocument body, AuthSyncStore store) =>
{
    var root = body.RootElement;
    var username = root.TryGetProperty("username", out var u) ? u.GetString() : null;
    var name = root.TryGetProperty("name", out var n) ? n.GetString() : null;
    var photoUrl = root.TryGetProperty("photoUrl", out var p) ? p.GetString() : null;

    if (string.IsNullOrWhiteSpace(username))
    {
        return Results.BadRequest(new { success = false, error = "Valid X (Twitter) username is required." });
    }

    var userEntry = store.AuthenticateTwitter(username, name, photoUrl);
    var profile = userEntry["profile"];
    var playlists = userEntry["playlists"];
    var likedTracks = userEntry["likedTracks"];
    var session = userEntry["playbackSession"];

    return Results.Ok(new
    {
        success = true,
        user = profile,
        token = $"token_twitter_{Guid.NewGuid():N}",
        playlists = playlists ?? new System.Text.Json.Nodes.JsonArray(),
        likedTracks = likedTracks ?? new System.Text.Json.Nodes.JsonArray(),
        playbackSession = session
    });
});

// Authentication: GitHub Sign-In & Return Cloud Playlists + Likes
app.MapPost("/api/auth/github", (JsonDocument body, AuthSyncStore store) =>
{
    var root = body.RootElement;
    var username = root.TryGetProperty("username", out var u) ? u.GetString() : null;
    var name = root.TryGetProperty("name", out var n) ? n.GetString() : null;
    var photoUrl = root.TryGetProperty("photoUrl", out var p) ? p.GetString() : null;

    if (string.IsNullOrWhiteSpace(username))
    {
        return Results.BadRequest(new { success = false, error = "Valid GitHub username is required." });
    }

    var userEntry = store.AuthenticateGithub(username, name, photoUrl);
    var profile = userEntry["profile"];
    var playlists = userEntry["playlists"];
    var likedTracks = userEntry["likedTracks"];
    var session = userEntry["playbackSession"];

    return Results.Ok(new
    {
        success = true,
        user = profile,
        token = $"token_github_{Guid.NewGuid():N}",
        playlists = playlists ?? new System.Text.Json.Nodes.JsonArray(),
        likedTracks = likedTracks ?? new System.Text.Json.Nodes.JsonArray(),
        playbackSession = session
    });
});

// Cloud Sync: Fetch User Data (Playlists, Likes, Profile)
app.MapGet("/api/user/sync", (string? userId, AuthSyncStore store) =>
{
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.BadRequest(new { success = false, error = "Missing userId parameter." });
    }

    var data = store.GetUserData(userId);
    if (data == null)
    {
        return Results.NotFound(new { success = false, error = "Account not found on cloud server." });
    }

    return Results.Ok(new
    {
        success = true,
        user = data["profile"],
        playlists = data["playlists"] ?? new System.Text.Json.Nodes.JsonArray(),
        likedTracks = data["likedTracks"] ?? new System.Text.Json.Nodes.JsonArray(),
        playbackSession = data["playbackSession"],
        updatedAt = data["updatedAt"]?.GetValue<string>()
    });
});

// Cloud Sync: Push Updated Playlists & Likes to Server
app.MapPost("/api/user/sync", (System.Text.Json.Nodes.JsonObject body, AuthSyncStore store) =>
{
    var userId = body["userId"]?.GetValue<string>();
    if (string.IsNullOrWhiteSpace(userId))
    {
        return Results.BadRequest(new { success = false, error = "Missing userId parameter." });
    }

    var playlists = body["playlists"] as System.Text.Json.Nodes.JsonArray;
    var likedTracks = body["likedTracks"] as System.Text.Json.Nodes.JsonArray;
    var session = body["playbackSession"] as System.Text.Json.Nodes.JsonObject;

    store.SaveUserData(userId, playlists, likedTracks, session);

    return Results.Ok(new
    {
        success = true,
        updatedAt = DateTime.UtcNow.ToString("o")
    });
});

// Spotify Link Resolver: Extract tracks from public playlist/album/track embed without credentials
app.MapGet("/api/spotify/resolve", async (string? url, IHttpClientFactory httpClientFactory, ILogger<Program> logger) =>
{
    if (string.IsNullOrWhiteSpace(url))
    {
        return Results.BadRequest(new { success = false, error = "Spotify URL is required." });
    }

    try
    {
        // Parse Spotify URL: match playlist, album, track from open.spotify.com or spotify: URI
        var match = System.Text.RegularExpressions.Regex.Match(
            url,
            @"(?:spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track)\/|spotify:(playlist|album|track):)([a-zA-Z0-9]+)",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        if (!match.Success)
        {
            return Results.BadRequest(new
            {
                success = false,
                error = "Invalid Spotify URL. Please paste a valid Spotify playlist, album, or track link."
            });
        }

        var type = !string.IsNullOrEmpty(match.Groups[1].Value)
            ? match.Groups[1].Value.ToLowerInvariant()
            : match.Groups[2].Value.ToLowerInvariant();
        var id = match.Groups[3].Value;

        var embedUrl = $"https://open.spotify.com/embed/{type}/{id}";
        var client = httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

        var response = await client.GetAsync(embedUrl);
        if (!response.IsSuccessStatusCode)
        {
            return Results.Json(new
            {
                success = false,
                error = $"Spotify returned HTTP {(int)response.StatusCode}. Please ensure the playlist is public."
            }, statusCode: StatusCodes.Status502BadGateway);
        }

        var html = await response.Content.ReadAsStringAsync();
        var scriptMatch = System.Text.RegularExpressions.Regex.Match(
            html,
            @"<script id=""__NEXT_DATA__""[^>]*>(.*?)<\/script>",
            System.Text.RegularExpressions.RegexOptions.Singleline);

        if (!scriptMatch.Success)
        {
            return Results.Json(new
            {
                success = false,
                error = "Could not parse playlist information from Spotify embed page."
            }, statusCode: StatusCodes.Status502BadGateway);
        }

        using var doc = JsonDocument.Parse(scriptMatch.Groups[1].Value);
        var root = doc.RootElement;

        if (!root.TryGetProperty("props", out var props) ||
            !props.TryGetProperty("pageProps", out var pageProps) ||
            !pageProps.TryGetProperty("state", out var state) ||
            !state.TryGetProperty("data", out var stateData) ||
            !stateData.TryGetProperty("entity", out var entity))
        {
            return Results.Json(new
            {
                success = false,
                error = "Track data entity missing from Spotify response."
            }, statusCode: StatusCodes.Status502BadGateway);
        }

        var title = entity.TryGetProperty("title", out var titleProp) ? titleProp.GetString() :
                    (entity.TryGetProperty("name", out var nameProp) ? nameProp.GetString() : "Spotify Playlist");

        var tracks = new List<object>();

        if (entity.TryGetProperty("trackList", out var trackList) && trackList.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in trackList.EnumerateArray())
            {
                var trackTitle = item.TryGetProperty("title", out var tProp) ? tProp.GetString() : null;
                var subtitle = item.TryGetProperty("subtitle", out var sProp) ? sProp.GetString() : "";
                var duration = item.TryGetProperty("duration", out var dProp)
                    ? (dProp.ValueKind == JsonValueKind.Number ? dProp.GetInt32() / 1000 : 0)
                    : 0;

                if (!string.IsNullOrWhiteSpace(trackTitle))
                {
                    tracks.Add(new
                    {
                        title = trackTitle.Trim(),
                        artist = (subtitle ?? "").Trim(),
                        duration = duration
                    });
                }
            }
        }
        else if (type == "track")
        {
            var trackTitle = entity.TryGetProperty("title", out var t) ? t.GetString() :
                             (entity.TryGetProperty("name", out var n) ? n.GetString() : "");
            var subtitle = entity.TryGetProperty("subtitle", out var s) ? s.GetString() : "";
            var duration = entity.TryGetProperty("duration", out var d)
                ? (d.ValueKind == JsonValueKind.Number ? d.GetInt32() / 1000 : 0)
                : 0;

            if (!string.IsNullOrWhiteSpace(trackTitle))
            {
                tracks.Add(new
                {
                    title = trackTitle.Trim(),
                    artist = (subtitle ?? "").Trim(),
                    duration = duration
                });
            }
        }

        return Results.Ok(new
        {
            success = true,
            type = type,
            title = title ?? "Spotify Import",
            trackCount = tracks.Count,
            tracks = tracks
        });
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to resolve Spotify URL {Url}", url);
        return Results.Json(new
        {
            success = false,
            error = $"Failed to parse Spotify link: {ex.Message}"
        }, statusCode: StatusCodes.Status500InternalServerError);
    }
});

app.Run();
