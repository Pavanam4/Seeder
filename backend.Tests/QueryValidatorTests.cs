using backend.Services;
using Xunit;

namespace backend.Tests;

public class QueryValidatorTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_RejectsEmptyOrWhitespace(string? input)
    {
        var result = QueryValidator.Validate(input);
        Assert.False(result.IsValid);
        Assert.Contains("cannot be empty", result.ErrorMessage);
    }

    [Fact]
    public void Validate_RejectsSingleCharacterQuery()
    {
        var result = QueryValidator.Validate("a");
        Assert.False(result.IsValid);
        Assert.Contains("too short", result.ErrorMessage);
    }

    [Fact]
    public void Validate_RejectsExcessivelyLongQuery()
    {
        var longQuery = new string('x', 250);
        var result = QueryValidator.Validate(longQuery);
        Assert.False(result.IsValid);
        Assert.Contains("too long", result.ErrorMessage);
    }

    [Fact]
    public void Validate_TrimsAndAcceptsValidQuery()
    {
        var result = QueryValidator.Validate("   Daft Punk - Get Lucky   ");
        Assert.True(result.IsValid);
        Assert.Equal("Daft Punk - Get Lucky", result.SanitizedQuery);
        Assert.Null(result.ErrorMessage);
    }

    [Theory]
    [InlineData(null, 20)]
    [InlineData(0, 20)]
    [InlineData(-5, 20)]
    [InlineData(10, 10)]
    [InlineData(50, 50)]
    [InlineData(100, 50)] // Caps at MaxLimit 50
    public void NormalizeLimit_EnforcesBounds(int? input, int expected)
    {
        var actual = QueryValidator.NormalizeLimit(input);
        Assert.Equal(expected, actual);
    }

    [Theory]
    [InlineData(null, 1)]
    [InlineData(0, 1)]
    [InlineData(-10, 1)]
    [InlineData(3, 3)]
    public void NormalizePage_EnforcesMinimumOne(int? input, int expected)
    {
        var actual = QueryValidator.NormalizePage(input);
        Assert.Equal(expected, actual);
    }
}
