using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using backend.Models;

namespace backend.Services;

public class InvidiousSearchProvider : ISearchProvider
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<InvidiousSearchProvider> _logger;

    public string ProviderId => "invidious";
    public string DisplayName => "Invidious (Alternative Engine)";
    public string Description => "Open-source front-end proxy API for YouTube with configurable public instances.";
    public bool RequiresExternalInstance => true;

    private static readonly string[] DefaultInstances = new[]
    {
        "https://inv.nadeko.net",
        "https://invidious.nerdvpn.de",
        "https://yt.artemislena.eu",
        "https://invidious.private.coffee"
    };

    public InvidiousSearchProvider(HttpClient httpClient, IConfiguration configuration, ILogger<InvidiousSearchProvider> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<SearchResponseDto> SearchAsync(string query, int limit, int page, CancellationToken cancellationToken = default)
    {
        var sw = Stopwatch.StartNew();

        var customInstance = _configuration["Invidious:InstanceUrl"]
            ?? Environment.GetEnvironmentVariable("INVIDIOUS_INSTANCE_URL");

        var instancesToTry = !string.IsNullOrWhiteSpace(customInstance)
            ? new[] { customInstance.TrimEnd('/') }
            : DefaultInstances;

        List<string> attemptErrors = new();

        foreach (var instance in instancesToTry)
        {
            try
            {
                var requestUrl = $"{instance}/api/v1/search?q={Uri.EscapeDataString(query)}&page={page}&type=video";
                _logger.LogInformation("Querying Invidious instance {Instance} for query '{Query}'", instance, query);

                using var request = new HttpRequestMessage(HttpMethod.Get, requestUrl);
                request.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MusicFetcherPOC/1.0");

                using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                cts.CancelAfter(TimeSpan.FromSeconds(8)); // aggressive timeout per instance

                var response = await _httpClient.SendAsync(request, cts.Token);
                if (!response.IsSuccessStatusCode)
                {
                    attemptErrors.Add($"{instance}: HTTP {(int)response.StatusCode} {response.ReasonPhrase}");
                    continue;
                }

                var contentStream = await response.Content.ReadAsStreamAsync(cancellationToken);
                var items = await JsonSerializer.DeserializeAsync<List<InvidiousItemDto>>(contentStream, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                }, cancellationToken);

                if (items == null)
                {
                    attemptErrors.Add($"{instance}: Received empty or invalid JSON response");
                    continue;
                }

                var tracks = items
                    .Where(i => !string.IsNullOrWhiteSpace(i.VideoId))
                    .Take(limit)
                    .Select(MapInvidiousItem)
                    .ToList();

                sw.Stop();
                return new SearchResponseDto
                {
                    Provider = $"{DisplayName} [{new Uri(instance).Host}]",
                    Query = query,
                    Page = page,
                    Limit = limit,
                    DurationMs = sw.ElapsedMilliseconds,
                    TotalReturned = tracks.Count,
                    HasMore = items.Count >= limit,
                    Items = tracks
                };
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
            {
                _logger.LogWarning(ex, "Failed to query Invidious instance {Instance}", instance);
                attemptErrors.Add($"{instance}: {ex.Message}");
            }
        }

        sw.Stop();
        throw new InvalidOperationException($"All Invidious instances failed or timed out. Attempts: {string.Join("; ", attemptErrors)}");
    }

    public static MusicTrack MapInvidiousItem(InvidiousItemDto item)
    {
        string? formattedDuration = null;
        if (item.LengthSeconds.HasValue)
        {
            var span = TimeSpan.FromSeconds(item.LengthSeconds.Value);
            formattedDuration = span.Hours > 0
                ? $"{span.Hours}:{span.Minutes:D2}:{span.Seconds:D2}"
                : $"{span.Minutes}:{span.Seconds:D2}";
        }

        var thumbnail = item.VideoThumbnails?.OrderByDescending(t => t.Width * t.Height).FirstOrDefault()?.Url
            ?? $"https://i.ytimg.com/vi/{item.VideoId}/hqdefault.jpg";

        return new MusicTrack
        {
            Id = item.VideoId ?? string.Empty,
            Title = item.Title ?? "Unknown Title",
            Artist = item.Author ?? "Unknown Artist",
            Duration = formattedDuration,
            DurationSeconds = item.LengthSeconds,
            ThumbnailUrl = thumbnail,
            YoutubeUrl = $"https://www.youtube.com/watch?v={item.VideoId}",
            IsEmbeddableCandidate = true
        };
    }

    public class InvidiousItemDto
    {
        [JsonPropertyName("videoId")]
        public string? VideoId { get; set; }

        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("author")]
        public string? Author { get; set; }

        [JsonPropertyName("lengthSeconds")]
        public double? LengthSeconds { get; set; }

        [JsonPropertyName("videoThumbnails")]
        public List<InvidiousThumbnailDto>? VideoThumbnails { get; set; }
    }

    public class InvidiousThumbnailDto
    {
        [JsonPropertyName("url")]
        public string? Url { get; set; }

        [JsonPropertyName("width")]
        public int Width { get; set; }

        [JsonPropertyName("height")]
        public int Height { get; set; }
    }
}
