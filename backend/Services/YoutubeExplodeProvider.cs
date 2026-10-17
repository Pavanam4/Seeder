using System.Diagnostics;
using backend.Models;
using YoutubeExplode;
using YoutubeExplode.Search;

namespace backend.Services;

public class YoutubeExplodeProvider : ISearchProvider
{
    private readonly YoutubeClient _client;
    private readonly ILogger<YoutubeExplodeProvider> _logger;

    public string ProviderId => "youtubeexplode";
    public string DisplayName => "YouTubeExplode (.NET Engine)";
    public string Description => "Direct scraper engine extracting search metadata from YouTube without API keys.";
    public bool RequiresExternalInstance => false;

    public YoutubeExplodeProvider(ILogger<YoutubeExplodeProvider> logger)
    {
        _logger = logger;
        _client = new YoutubeClient();
    }

    public async Task<SearchResponseDto> SearchAsync(string query, int limit, int page, CancellationToken cancellationToken = default)
    {
        var sw = Stopwatch.StartNew();
        var skipCount = (page - 1) * limit;
        var takeCount = limit + 1; // Take 1 extra to determine HasMore
        var totalTarget = skipCount + takeCount;

        var results = new List<MusicTrack>();
        var currentIndex = 0;

        try
        {
            await foreach (var video in _client.Search.GetVideosAsync(query, cancellationToken))
            {
                if (currentIndex >= skipCount)
                {
                    var track = MapToTrack(video);
                    results.Add(track);

                    if (results.Count >= takeCount)
                    {
                        break;
                    }
                }

                currentIndex++;
                if (currentIndex >= totalTarget)
                {
                    break;
                }
            }

            sw.Stop();
            var hasMore = results.Count > limit;
            var finalItems = hasMore ? results.Take(limit).ToList() : results;

            return new SearchResponseDto
            {
                Provider = DisplayName,
                Query = query,
                Page = page,
                Limit = limit,
                DurationMs = sw.ElapsedMilliseconds,
                TotalReturned = finalItems.Count,
                HasMore = hasMore,
                Items = finalItems
            };
        }
        catch (OperationCanceledException)
        {
            sw.Stop();
            _logger.LogWarning("Search query for '{Query}' timed out or was canceled.", query);
            throw;
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Error executing search on YouTubeExplode for '{Query}'", query);
            throw;
        }
    }

    public static MusicTrack MapToTrack(VideoSearchResult video)
    {
        var durationSpan = video.Duration;
        string? formattedDuration = null;
        if (durationSpan.HasValue)
        {
            var span = durationSpan.Value;
            formattedDuration = span.Hours > 0
                ? $"{span.Hours}:{span.Minutes:D2}:{span.Seconds:D2}"
                : $"{span.Minutes}:{span.Seconds:D2}";
        }

        // Select the highest resolution thumbnail or fallback
        var bestThumbnail = video.Thumbnails
            .OrderByDescending(t => t.Resolution.Area)
            .FirstOrDefault()?.Url
            ?? $"https://i.ytimg.com/vi/{video.Id.Value}/hqdefault.jpg";

        return new MusicTrack
        {
            Id = video.Id.Value,
            Title = video.Title,
            Artist = !string.IsNullOrWhiteSpace(video.Author.ChannelTitle) ? video.Author.ChannelTitle : "Unknown Artist",
            Duration = formattedDuration,
            DurationSeconds = durationSpan?.TotalSeconds,
            ThumbnailUrl = bestThumbnail,
            YoutubeUrl = video.Url,
            IsEmbeddableCandidate = true // Standard YouTube search results are embed-candidate until verified by player API
        };
    }
}
