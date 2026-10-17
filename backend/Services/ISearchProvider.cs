using backend.Models;

namespace backend.Services;

public interface ISearchProvider
{
    string ProviderId { get; }
    string DisplayName { get; }
    string Description { get; }
    bool RequiresExternalInstance { get; }

    Task<SearchResponseDto> SearchAsync(string query, int limit, int page, CancellationToken cancellationToken = default);

    Task<SearchResponseDto> SearchAsync(string query, int limit, int page, string? filter, CancellationToken cancellationToken = default)
        => SearchAsync(query, limit, page, cancellationToken);
}
