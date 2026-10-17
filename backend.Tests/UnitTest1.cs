using YoutubeExplode;
using Xunit;

namespace backend.Tests;

public class YoutubeExplodeLiveTest
{
    [Fact]
    public async Task CanSearchVideos()
    {
        var client = new YoutubeClient();
        var videos = new List<string>();
        await foreach (var video in client.Search.GetVideosAsync("Daft Punk"))
        {
            videos.Add(video.Title);
            if (videos.Count >= 3) break;
        }

        Assert.NotEmpty(videos);
        Assert.True(videos.Count == 3);
    }
}