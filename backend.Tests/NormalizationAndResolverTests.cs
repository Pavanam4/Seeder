using backend.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace backend.Tests;

public class ResultNormalizationTests
{
    [Fact]
    public void MapInvidiousItem_NormalizesStandardVideo()
    {
        var raw = new InvidiousSearchProvider.InvidiousItemDto
        {
            VideoId = "dQw4w9WgXcQ",
            Title = "Rick Astley - Never Gonna Give You Up",
            Author = "RickAstleyVEVO",
            LengthSeconds = 213,
            VideoThumbnails = new List<InvidiousSearchProvider.InvidiousThumbnailDto>
            {
                new() { Url = "https://example.com/small.jpg", Width = 120, Height = 90 },
                new() { Url = "https://example.com/large.jpg", Width = 1280, Height = 720 }
            }
        };

        var track = InvidiousSearchProvider.MapInvidiousItem(raw);

        Assert.Equal("dQw4w9WgXcQ", track.Id);
        Assert.Equal("Rick Astley - Never Gonna Give You Up", track.Title);
        Assert.Equal("RickAstleyVEVO", track.Artist);
        Assert.Equal("3:33", track.Duration);
        Assert.Equal(213, track.DurationSeconds);
        Assert.Equal("https://example.com/large.jpg", track.ThumbnailUrl);
        Assert.Equal("https://www.youtube.com/watch?v=dQw4w9WgXcQ", track.YoutubeUrl);
        Assert.True(track.IsEmbeddableCandidate);
    }

    [Fact]
    public void MapInvidiousItem_HandlesNullsAndLongDurations()
    {
        var raw = new InvidiousSearchProvider.InvidiousItemDto
        {
            VideoId = "long123",
            Title = null,
            Author = null,
            LengthSeconds = 3665, // 1 hr 1 min 5 sec
            VideoThumbnails = null
        };

        var track = InvidiousSearchProvider.MapInvidiousItem(raw);

        Assert.Equal("long123", track.Id);
        Assert.Equal("Unknown Title", track.Title);
        Assert.Equal("Unknown Artist", track.Artist);
        Assert.Equal("1:01:05", track.Duration);
        Assert.Equal("https://i.ytimg.com/vi/long123/hqdefault.jpg", track.ThumbnailUrl);
    }
}

public class SearchProviderResolverTests
{
    private class DummyYtMusicProvider : ISearchProvider
    {
        public string ProviderId => "ytmusicapi";
        public string DisplayName => "ytmusicapi (YouTube Music Engine)";
        public string Description => "Test Provider";
        public bool RequiresExternalInstance => false;
        public Task<backend.Models.SearchResponseDto> SearchAsync(string query, int limit, int page, CancellationToken cancellationToken = default)
            => Task.FromResult(new backend.Models.SearchResponseDto
            {
                Provider = DisplayName,
                Query = query,
                Page = page,
                Limit = limit,
                DurationMs = 10,
                TotalReturned = 0,
                HasMore = false,
                Items = Array.Empty<backend.Models.MusicTrack>()
            });
    }

    [Fact]
    public void Resolves_DefaultToYtMusicApiWhenPresent()
    {
        var ytMusicProvider = new DummyYtMusicProvider();
        var ytProvider = new YoutubeExplodeProvider(NullLogger<YoutubeExplodeProvider>.Instance);
        var inProvider = new InvidiousSearchProvider(new HttpClient(), new ConfigurationBuilder().Build(), NullLogger<InvidiousSearchProvider>.Instance);

        var resolver = new SearchProviderResolver(new ISearchProvider[] { ytMusicProvider, ytProvider, inProvider });

        var resolved = resolver.Resolve(null);
        Assert.Equal("ytmusicapi", resolved.ProviderId);
    }

    [Fact]
    public void Resolves_FallsBackToYoutubeExplodeWhenYtMusicMissing()
    {
        var ytProvider = new YoutubeExplodeProvider(NullLogger<YoutubeExplodeProvider>.Instance);
        var inProvider = new InvidiousSearchProvider(new HttpClient(), new ConfigurationBuilder().Build(), NullLogger<InvidiousSearchProvider>.Instance);

        var resolver = new SearchProviderResolver(new ISearchProvider[] { ytProvider, inProvider });

        var resolved = resolver.Resolve(null);
        Assert.Equal("youtubeexplode", resolved.ProviderId);
    }

    [Fact]
    public void Resolves_InvidiousWhenRequested()
    {
        var ytMusicProvider = new DummyYtMusicProvider();
        var ytProvider = new YoutubeExplodeProvider(NullLogger<YoutubeExplodeProvider>.Instance);
        var inProvider = new InvidiousSearchProvider(new HttpClient(), new ConfigurationBuilder().Build(), NullLogger<InvidiousSearchProvider>.Instance);

        var resolver = new SearchProviderResolver(new ISearchProvider[] { ytMusicProvider, ytProvider, inProvider });

        var resolved = resolver.Resolve("invidious");
        Assert.Equal("invidious", resolved.ProviderId);
    }

    [Fact]
    public void Resolves_UnknownProviderFallsBackToDefault()
    {
        var ytMusicProvider = new DummyYtMusicProvider();
        var ytProvider = new YoutubeExplodeProvider(NullLogger<YoutubeExplodeProvider>.Instance);
        var inProvider = new InvidiousSearchProvider(new HttpClient(), new ConfigurationBuilder().Build(), NullLogger<InvidiousSearchProvider>.Instance);

        var resolver = new SearchProviderResolver(new ISearchProvider[] { ytMusicProvider, ytProvider, inProvider });

        var resolved = resolver.Resolve("non_existent_engine");
        Assert.Equal("ytmusicapi", resolved.ProviderId);
    }
}
