namespace backend.Services;

public record ValidationResult(bool IsValid, string? SanitizedQuery, string? ErrorMessage);

public static class QueryValidator
{
    public const int MinQueryLength = 2;
    public const int MaxQueryLength = 150;
    public const int DefaultLimit = 20;
    public const int MaxLimit = 50;
    public const int MinLimit = 1;

    public static ValidationResult Validate(string? rawQuery)
    {
        if (string.IsNullOrWhiteSpace(rawQuery))
        {
            return new ValidationResult(false, null, "Search query cannot be empty.");
        }

        var trimmed = rawQuery.Trim();

        if (trimmed.Length < MinQueryLength)
        {
            return new ValidationResult(false, null, $"Query is too short. Minimum {MinQueryLength} characters required.");
        }

        if (trimmed.Length > MaxQueryLength)
        {
            return new ValidationResult(false, null, $"Query is too long. Maximum {MaxQueryLength} characters allowed.");
        }

        return new ValidationResult(true, trimmed, null);
    }

    public static int NormalizeLimit(int? limit)
    {
        if (!limit.HasValue || limit.Value < MinLimit) return DefaultLimit;
        if (limit.Value > MaxLimit) return MaxLimit;
        return limit.Value;
    }

    public static int NormalizePage(int? page)
    {
        if (!page.HasValue || page.Value < 1) return 1;
        return page.Value;
    }
}
