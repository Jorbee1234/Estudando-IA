namespace Api.Dtos;

/// <summary>A user's public profile.</summary>
/// <param name="Id">User id.</param>
/// <param name="Name">Display name.</param>
/// <param name="Handle">The user's unique @username (without the "@").</param>
/// <param name="About">Free text written by the user; null when empty.</param>
/// <param name="AccentColor">Accent color as #RRGGBB; null means the default green.</param>
/// <param name="AvatarUrl">URL of the profile picture; null when none was uploaded.</param>
/// <param name="BannerUrl">URL of the banner image; null when none was uploaded.</param>
/// <param name="PostsCount">Number of posts published by the user.</param>
/// <param name="UsernameChangeAvailableAt">When the @username may be changed again; null when it can be changed now.</param>
/// <param name="Links">Related resources and the actions available to the caller.</param>
public sealed record ProfileResponse(
    Guid Id,
    string Name,
    string Handle,
    string? About,
    string? AccentColor,
    string? AvatarUrl,
    string? BannerUrl,
    int PostsCount,
    DateTime? UsernameChangeAvailableAt,
    IReadOnlyList<Link> Links);

/// <summary>
/// Partial update of the editable profile fields. An omitted or <c>null</c> field is kept;
/// an empty string clears <see cref="About"/> and <see cref="AccentColor"/>.
/// </summary>
public sealed class UpdateProfileRequest
{
    /// <summary>Display name, 2 to 100 characters. Can be changed at any time.</summary>
    /// <example>Júlio Oliveira</example>
    public string? Name { get; init; }

    /// <summary>Unique @username (3 to 30 lowercase letters, digits or underscores). Once every 30 days.</summary>
    /// <example>julio_dev</example>
    public string? Username { get; init; }

    /// <summary>Up to 500 characters.</summary>
    public string? About { get; init; }

    /// <summary>Color as #RRGGBB with enough contrast against the dark background.</summary>
    /// <example>#81FE88</example>
    public string? AccentColor { get; init; }
}
