namespace Api.Application.Models;

public enum ProfileImageKind
{
    Avatar,
    Banner,
}

public sealed record ProfileView(
    Guid Id,
    string Name,
    string Handle,
    DateTime? UsernameChangedAt,
    string? About,
    string? AccentColor,
    bool HasAvatar,
    bool HasBanner,
    long Version,
    int PostsCount);

public sealed record ProfileImage(byte[] Data, string ContentType, DateTime UpdatedAt);

/// <summary>
/// What the caller asked to change. <c>null</c> means "keep"; an empty string clears <c>About</c> and
/// <c>AccentColor</c> (it is invalid for <c>Name</c> and <c>Username</c>).
/// </summary>
public sealed record ProfileChanges(string? Name, string? Username, string? About, string? AccentColor);

/// <summary>Validated and normalized changes. <c>null</c> name/username mean "keep".</summary>
public sealed record ProfileUpdate(
    string? Name, string? Username, bool SetAbout, string? About, bool SetAccentColor, string? AccentColor);

public enum UpdateProfileOutcome
{
    Updated,
    UsernameTaken,
    UsernameTooSoon,
}
