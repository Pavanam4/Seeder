namespace backend.Services;

public class SearchProviderResolver
{
    private readonly IEnumerable<ISearchProvider> _providers;

    public SearchProviderResolver(IEnumerable<ISearchProvider> providers)
    {
        _providers = providers;
    }

    public ISearchProvider Resolve(string? providerId)
    {
        if (string.IsNullOrWhiteSpace(providerId))
        {
            // Primary default provider is ytmusicapi, fallback to youtubeexplode or first
            return _providers.FirstOrDefault(p => p.ProviderId == "ytmusicapi")
                   ?? _providers.FirstOrDefault(p => p.ProviderId == "youtubeexplode")
                   ?? _providers.First();
        }

        var match = _providers.FirstOrDefault(p =>
            string.Equals(p.ProviderId, providerId, StringComparison.OrdinalIgnoreCase));

        return match
               ?? _providers.FirstOrDefault(p => p.ProviderId == "ytmusicapi")
               ?? _providers.FirstOrDefault(p => p.ProviderId == "youtubeexplode")
               ?? _providers.First();
    }

    public IEnumerable<ISearchProvider> GetAllProviders() => _providers;
}
