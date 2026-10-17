using System.Diagnostics;
using System.Text.Json;
using backend.Models;

namespace backend.Services;

public class YtMusicApiProvider : ISearchProvider
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _config;
    private readonly ILogger<YtMusicApiProvider> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public string ProviderId => "ytmusicapi";
    public string DisplayName => "ytmusicapi (YouTube Music Engine)";
    public string Description => "High-fidelity search using YouTube Music's catalog for songs, artists, albums, and playlists without API keys.";
    public bool RequiresExternalInstance => false;

    public YtMusicApiProvider(
        IHttpClientFactory httpClientFactory,
        IConfiguration config,
        ILogger<YtMusicApiProvider> logger)
    {
        _httpClientFactory = httpClientFactory;
        _config = config;
        _logger = logger;
    }

    public Task<SearchResponseDto> SearchAsync(string query, int limit, int page, CancellationToken cancellationToken = default)
    {
        return SearchAsync(query, limit, page, filter: null, cancellationToken);
    }

    public async Task<SearchResponseDto> SearchAsync(
        string query,
        int limit,
        int page,
        string? filter,
        CancellationToken cancellationToken = default)
    {
        var sw = Stopwatch.StartNew();
        var serviceUrl = _config.GetValue<string>("YtMusicApi:ServiceUrl") ?? "http://127.0.0.1:5006";
        var client = _httpClientFactory.CreateClient("YtMusicApiClient");

        var queryString = $"?q={Uri.EscapeDataString(query)}&limit={limit}&page={page}";
        if (!string.IsNullOrWhiteSpace(filter))
        {
            queryString += $"&filter={Uri.EscapeDataString(filter)}";
        }

        var requestUri = $"{serviceUrl.TrimEnd('/')}/api/search{queryString}";

        try
        {
            var response = await client.GetAsync(requestUri, cancellationToken);
            sw.Stop();

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("ytmusicapi service returned HTTP {StatusCode}: {ErrorBody}",
                    (int)response.StatusCode, errorBody);

                string message;
                try
                {
                    using var doc = JsonDocument.Parse(errorBody);
                    if (doc.RootElement.TryGetProperty("detail", out var detailEl))
                    {
                        if (detailEl.ValueKind == JsonValueKind.Object && detailEl.TryGetProperty("error", out var errEl))
                        {
                            message = errEl.GetString() ?? errorBody;
                        }
                        else
                        {
                            message = detailEl.GetString() ?? errorBody;
                        }
                    }
                    else
                    {
                        message = errorBody;
                    }
                }
                catch
                {
                    message = errorBody;
                }

                throw new HttpRequestException(
                    $"ytmusicapi search failed: {message}",
                    inner: null,
                    statusCode: response.StatusCode);
            }

            var contentStream = await response.Content.ReadAsStreamAsync(cancellationToken);
            var searchResponse = await JsonSerializer.DeserializeAsync<SearchResponseDto>(
                contentStream, JsonOptions, cancellationToken);

            if (searchResponse == null)
            {
                throw new InvalidOperationException("Failed to deserialize search response from ytmusicapi service.");
            }

            return searchResponse with
            {
                DurationMs = sw.ElapsedMilliseconds
            };
        }
        catch (HttpRequestException ex) when (ex.InnerException is System.Net.Sockets.SocketException ||
                                              ex.StatusCode == null)
        {
            sw.Stop();
            _logger.LogError(ex, "Unable to connect to ytmusicapi service at {ServiceUrl}", serviceUrl);
            throw new InvalidOperationException(
                $"ytmusicapi service is unreachable at {serviceUrl}. Ensure the Python FastAPI service is running ('python ytmusic_service/main.py').",
                ex);
        }
        catch (OperationCanceledException)
        {
            sw.Stop();
            _logger.LogWarning("ytmusicapi search request for '{Query}' timed out.", query);
            throw;
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Unexpected error communicating with ytmusicapi provider");
            throw;
        }
    }
}
