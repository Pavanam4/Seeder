using System.Diagnostics;
using System.Runtime.InteropServices;
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

app.Run();
