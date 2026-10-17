namespace backend.Models;

public record MusicTrack
{
    public required string Id { get; init; }
    public required string Title { get; init; }
    public required string Artist { get; init; }
    public string? Album { get; init; }
    public string? Duration { get; init; }
    public double? DurationSeconds { get; init; }
    public string? ThumbnailUrl { get; init; }
    public required string YoutubeUrl { get; init; }
    public string? ResultType { get; init; } = "song";
    public string? Source { get; init; } = "ytmusicapi";
    public bool IsEmbeddableCandidate { get; init; } = true;
}

public record SearchResponseDto
{
    public required string Provider { get; init; }
    public required string Query { get; init; }
    public int Page { get; init; }
    public int Limit { get; init; }
    public long DurationMs { get; init; }
    public int TotalReturned { get; init; }
    public bool HasMore { get; init; }
    public required IReadOnlyList<MusicTrack> Items { get; init; }
    public string? ErrorMessage { get; init; }
    public int? StatusCode { get; init; }
}

public record ProviderInfoDto
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Description { get; init; }
    public bool IsDefault { get; init; }
    public bool RequiresExternalInstance { get; init; }
}
