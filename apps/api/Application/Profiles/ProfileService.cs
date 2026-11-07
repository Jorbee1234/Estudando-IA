using Api.Application.Abstractions;
using Api.Application.Common;
using Api.Application.Models;
using Api.Domain;

namespace Api.Application.Profiles;

public sealed class ProfileService(IProfileRepository profiles, IUserStore users)
{
    public const int AvatarMaxBytes = 2 * 1024 * 1024;
    public const int BannerMaxBytes = 4 * 1024 * 1024;

    public const string ImageField = "file";
    public const string UsernameField = "Username";
    public const string NameField = "Name";
    public const string AboutField = "About";
    public const string AccentColorField = "AccentColor";

    public static int MaxBytes(ProfileImageKind kind) => kind == ProfileImageKind.Avatar ? AvatarMaxBytes : BannerMaxBytes;

    public async Task<Result<ProfileView>> GetAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await profiles.GetAsync(userId, cancellationToken) is { } profile ? profile : Errors.ProfileNotFound;

    public async Task<Result<ProfileView>> UpdateAsync(
        Guid? userId, ProfileChanges changes, CancellationToken cancellationToken = default)
    {
        if (userId is not { } id || await users.FindByIdAsync(id, cancellationToken) is not { } user)
        {
            return Errors.Unauthenticated;
        }

        var fields = new Dictionary<string, string[]>();
        AppError? first = null;

        void Reject(AppError error, string field, string message)
        {
            first ??= error;
            fields[field] = [message];
        }

        string? name = null;
        if (changes.Name is not null)
        {
            name = User.NormalizeName(changes.Name);
            if (!User.IsValidName(name))
            {
                Reject(Errors.InvalidName(NameField), NameField, Messages.InvalidName);
            }
        }

        string? username = null;
        if (changes.Username is not null)
        {
            var requested = Username.Normalize(changes.Username);
            if (!Username.IsValid(requested))
            {
                Reject(Errors.InvalidUsername(UsernameField), UsernameField, Messages.InvalidUsername);
            }
            else if (requested != user.Username)
            {
                username = requested;
            }
        }

        string? about = null;
        if (changes.About is not null)
        {
            about = UserProfile.NormalizeAbout(changes.About);
            if (about is { Length: > UserProfile.AboutMaxLength })
            {
                Reject(Errors.AboutTooLong(AboutField), AboutField, Messages.AboutTooLong);
            }
        }

        string? color = null;
        if (changes.AccentColor is not null)
        {
            if (!AccentColor.TryNormalize(changes.AccentColor, out color))
            {
                Reject(Errors.InvalidAccentColor(AccentColorField), AccentColorField, Messages.InvalidAccentColor);
            }
            else if (color is not null && !AccentColor.HasEnoughContrast(color))
            {
                Reject(Errors.LowContrastAccentColor(AccentColorField), AccentColorField, Messages.LowContrastAccentColor);
            }
        }

        if (first is not null)
        {
            return first with { Fields = fields };
        }

        var now = DateTime.UtcNow;
        if (username is not null && Username.NextChangeAt(user.UsernameChangedAt, now) is { } availableAt)
        {
            return Errors.UsernameChangeTooSoon(availableAt);
        }

        var update = new ProfileUpdate(
            name, username, changes.About is not null, about, changes.AccentColor is not null, color);

        switch (await profiles.UpdateAsync(id, update, now, now - Username.ChangeInterval, cancellationToken))
        {
            case UpdateProfileOutcome.UsernameTaken:
                return Errors.UsernameTaken(UsernameField);
            case UpdateProfileOutcome.UsernameTooSoon:
                return Errors.UsernameChangeTooSoon(now + Username.ChangeInterval);
            default:
                return await GetAsync(id, cancellationToken);
        }
    }

    public async Task<Result> SetImageAsync(
        Guid? userId, ProfileImageKind kind, byte[] data, CancellationToken cancellationToken = default)
    {
        if (await RequireUserAsync(userId, cancellationToken) is not { } id)
        {
            return Errors.Unauthenticated;
        }

        if (data.Length == 0)
        {
            return Errors.ImageMissing(ImageField);
        }

        if (data.Length > MaxBytes(kind))
        {
            return Errors.ImageTooLarge(
                ImageField, kind == ProfileImageKind.Avatar ? Messages.AvatarTooLarge : Messages.BannerTooLarge);
        }

        if (ImageSignature.Detect(data) is not { } contentType)
        {
            return Errors.InvalidImageType(ImageField);
        }

        await profiles.SaveImageAsync(id, kind, data, contentType, cancellationToken);
        return Result.Success;
    }

    public async Task<Result> RemoveImageAsync(
        Guid? userId, ProfileImageKind kind, CancellationToken cancellationToken = default)
    {
        if (await RequireUserAsync(userId, cancellationToken) is not { } id)
        {
            return Errors.Unauthenticated;
        }

        await profiles.RemoveImageAsync(id, kind, cancellationToken);
        return Result.Success;
    }

    public async Task<Result<ProfileImage>> GetImageAsync(
        Guid userId, ProfileImageKind kind, CancellationToken cancellationToken = default) =>
        await profiles.GetImageAsync(userId, kind, cancellationToken) is { } image ? image : Errors.ImageNotFound;

    private async Task<Guid?> RequireUserAsync(Guid? userId, CancellationToken cancellationToken) =>
        userId is { } id && await users.FindByIdAsync(id, cancellationToken) is not null ? id : null;
}
