namespace Api.Domain;

public sealed class UserProfile
{
    public const int AboutMaxLength = 500;

    public Guid UserId { get; init; }
    public string? About { get; set; }
    public byte[]? AvatarData { get; set; }
    public string? AvatarContentType { get; set; }
    public byte[]? BannerData { get; set; }
    public string? BannerContentType { get; set; }

    /// <summary>Accent color as <c>#RRGGBB</c>; null means the default green.</summary>
    public string? AccentColor { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Trims the text; blank becomes null.</summary>
    public static string? NormalizeAbout(string? about) =>
        string.IsNullOrWhiteSpace(about) ? null : about.Trim();
}
