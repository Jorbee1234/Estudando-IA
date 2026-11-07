using Api.Application.Models;

namespace Api.Application.Abstractions;

public interface IProfileRepository
{
    /// <summary>Returns the profile of an existing user (an empty one if never edited), or null if the user does not exist.</summary>
    Task<ProfileView?> GetAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Version of the user's picture for cache busting, or null when there is none.</summary>
    Task<long?> GetAvatarVersionAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Applies every change or none: the name, the username (only if never changed or last changed at or before
    /// <paramref name="usernameAllowedSince"/>, checked in the same statement that writes it), the about text and the color.
    /// </summary>
    Task<UpdateProfileOutcome> UpdateAsync(
        Guid userId, ProfileUpdate update, DateTime now, DateTime usernameAllowedSince,
        CancellationToken cancellationToken = default);

    Task SaveImageAsync(
        Guid userId, ProfileImageKind kind, byte[] data, string contentType, CancellationToken cancellationToken = default);

    /// <summary>Removes the image. Does nothing when there is none.</summary>
    Task RemoveImageAsync(Guid userId, ProfileImageKind kind, CancellationToken cancellationToken = default);

    Task<ProfileImage?> GetImageAsync(Guid userId, ProfileImageKind kind, CancellationToken cancellationToken = default);
}
