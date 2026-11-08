using Api.Application.Profiles;
using Api.Domain;
using Xunit;

namespace Api.Tests;

public sealed class ProfileDomainTests
{
    [Theory]
    [InlineData(null, null)]
    [InlineData("", null)]
    [InlineData("   ", null)]
    [InlineData("  Olá, mundo  ", "Olá, mundo")]
    public void About_is_trimmed_and_blank_becomes_null(string? input, string? expected) =>
        Assert.Equal(expected, UserProfile.NormalizeAbout(input));

    [Theory]
    [InlineData("#81fe88", "#81FE88")]
    [InlineData("  #7dd3fc ", "#7DD3FC")]
    [InlineData(null, null)]
    [InlineData("", null)]
    public void Valid_colors_are_normalized_to_upper_case(string? input, string? expected)
    {
        Assert.True(AccentColor.TryNormalize(input, out var normalized));
        Assert.Equal(expected, normalized);
    }

    [Theory]
    [InlineData("81FE88")]
    [InlineData("#81FE8")]
    [InlineData("#81FE88F")]
    [InlineData("#GGGGGG")]
    [InlineData("red")]
    [InlineData("rgb(0,0,0)")]
    public void Malformed_colors_are_rejected(string input) =>
        Assert.False(AccentColor.TryNormalize(input, out _));

    [Theory]
    [InlineData("#81FE88", true)]
    [InlineData("#FFFFFF", true)]
    [InlineData("#7DD3FC", true)]
    [InlineData("#00090E", false)]
    [InlineData("#000000", false)]
    [InlineData("#111111", false)]
    public void Contrast_against_the_dark_background_is_checked(string color, bool enough) =>
        Assert.Equal(enough, AccentColor.HasEnoughContrast(color));

    [Fact]
    public void Contrast_of_white_against_the_background_is_the_highest_possible()
    {
        Assert.True(AccentColor.ContrastAgainstBackground("#FFFFFF") > 15);
        Assert.True(AccentColor.ContrastAgainstBackground("#000000") < 1.1);
    }

    [Theory]
    [InlineData("  Júlio Costa  ", "Júlio Costa")]
    [InlineData("", "")]
    [InlineData(null, "")]
    public void Name_is_trimmed(string? input, string expected) =>
        Assert.Equal(expected, User.NormalizeName(input));

    [Theory]
    [InlineData("Jo", true)]
    [InlineData("J", false)]
    [InlineData("", false)]
    public void Name_has_at_least_two_characters(string name, bool valid) =>
        Assert.Equal(valid, User.IsValidName(name));

    [Fact]
    public void Name_has_at_most_100_characters()
    {
        Assert.True(User.IsValidName(new string('a', 100)));
        Assert.False(User.IsValidName(new string('a', 101)));
    }

    [Theory]
    [InlineData("  Julio_Dev ", "julio_dev")]
    [InlineData("ANA", "ana")]
    [InlineData(null, "")]
    public void Username_is_trimmed_and_lower_cased(string? input, string expected) =>
        Assert.Equal(expected, Username.Normalize(input));

    [Theory]
    [InlineData("abc", true)]
    [InlineData("julio_dev", true)]
    [InlineData("a1_", true)]
    [InlineData("ab", false)]
    [InlineData("", false)]
    [InlineData("has space", false)]
    [InlineData("com-hifen", false)]
    [InlineData("acentuação", false)]
    [InlineData("MAIUSCULA", false)]
    [InlineData("me", false)]
    [InlineData("admin", false)]
    public void Username_format_and_reserved_words(string username, bool valid) =>
        Assert.Equal(valid, Username.IsValid(username));

    [Fact]
    public void Username_length_limits_are_3_and_30()
    {
        Assert.True(Username.IsValid(new string('a', 30)));
        Assert.False(Username.IsValid(new string('a', 31)));
    }

    [Theory]
    [InlineData("Júlio Costa", "julio")]
    [InlineData("  Ana  Souza ", "ana")]
    [InlineData("Ângela", "angela")]
    [InlineData("Zé", "userze")]
    [InlineData("!!!", "user")]
    [InlineData("", "user")]
    [InlineData("O'Neil", "oneil")]
    public void Initial_username_comes_from_the_first_word_of_the_name(string name, string expected) =>
        Assert.Equal(expected, Username.FromName(name));

    [Fact]
    public void Initial_username_is_shortened_so_a_suffix_always_fits()
    {
        var username = Username.FromName(new string('a', 80));

        Assert.Equal(22, username.Length);
        Assert.True(Username.IsValid(Username.WithSuffix(username, 100)));
        Assert.True(Username.WithSuffix(username, 100).Length <= Username.MaxLength);
    }

    [Fact]
    public void Suffix_starts_at_the_second_attempt()
    {
        Assert.Equal("ana", Username.WithSuffix("ana", 1));
        Assert.Equal("ana_2", Username.WithSuffix("ana", 2));
        Assert.Equal("ana_5", Username.WithSuffix("ana", 5));
    }

    [Fact]
    public void Later_attempts_use_a_random_number_so_common_names_never_run_out()
    {
        var candidates = Enumerable.Range(6, 200).Select(attempt => Username.WithSuffix("maria", attempt)).ToList();

        Assert.All(candidates, c => Assert.Matches(@"^maria_\d{4,6}$", c));
        Assert.All(candidates, c => Assert.True(Username.IsValid(c)));
        Assert.True(candidates.Distinct().Count() > 150);
    }

    [Fact]
    public void Username_can_be_changed_when_never_changed_or_after_30_days()
    {
        var now = new DateTime(2026, 11, 7, 12, 0, 0, DateTimeKind.Utc);

        Assert.Null(Username.NextChangeAt(null, now));
        Assert.Null(Username.NextChangeAt(now.AddDays(-30), now));
        Assert.Null(Username.NextChangeAt(now.AddDays(-45), now));
    }

    [Fact]
    public void Username_change_is_blocked_inside_the_30_day_window()
    {
        var now = new DateTime(2026, 11, 7, 12, 0, 0, DateTimeKind.Utc);

        Assert.Equal(now.AddDays(1), Username.NextChangeAt(now.AddDays(-29), now));
        Assert.Equal(now.AddDays(30), Username.NextChangeAt(now, now));
    }

    [Fact]
    public void Png_jpeg_and_webp_are_detected_from_their_first_bytes()
    {
        Assert.Equal("image/png", ImageSignature.Detect(TestImages.Png));
        Assert.Equal("image/jpeg", ImageSignature.Detect(TestImages.Jpeg));
        Assert.Equal("image/webp", ImageSignature.Detect(TestImages.Webp));
    }

    [Fact]
    public void Other_content_is_not_an_image()
    {
        Assert.Null(ImageSignature.Detect("GIF89a......"u8));
        Assert.Null(ImageSignature.Detect("<svg xmlns='http://www.w3.org/2000/svg'/>"u8));
        Assert.Null(ImageSignature.Detect([0x89, 0x50]));
        Assert.Null(ImageSignature.Detect([]));
    }
}

public static class TestImages
{
    public static readonly byte[] Png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];

    public static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46];

    public static readonly byte[] Webp =
        [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20];

    public static byte[] PngOfSize(int length)
    {
        var data = new byte[length];
        Png.CopyTo(data, 0);
        return data;
    }
}
