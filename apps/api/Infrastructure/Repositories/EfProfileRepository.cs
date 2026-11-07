using Api.Application.Abstractions;
using Api.Application.Common;
using Api.Application.Models;
using Api.Domain;
using Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Api.Infrastructure.Repositories;

public sealed class EfProfileRepository(AppDbContext db) : IProfileRepository
{
    public async Task<ProfileView?> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.Id, u.Name, u.Username, u.UsernameChangedAt })
            .FirstOrDefaultAsync(cancellationToken);
        if (user is null)
        {
            return null;
        }

        var profile = await db.UserProfiles.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => new
            {
                p.About,
                p.AccentColor,
                HasAvatar = p.AvatarData != null,
                HasBanner = p.BannerData != null,
                p.UpdatedAt,
            })
            .FirstOrDefaultAsync(cancellationToken);

        var postsCount = await db.Posts.CountAsync(p => p.AuthorId == userId, cancellationToken);

        return new ProfileView(
            user.Id, user.Name, user.Username, user.UsernameChangedAt,
            profile?.About, profile?.AccentColor,
            profile?.HasAvatar ?? false, profile?.HasBanner ?? false,
            profile?.UpdatedAt.Ticks ?? 0, postsCount);
    }

    public async Task<long?> GetAvatarVersionAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var updatedAt = await db.UserProfiles.AsNoTracking()
            .Where(p => p.UserId == userId && p.AvatarData != null)
            .Select(p => (DateTime?)p.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        return updatedAt?.Ticks;
    }

    public async Task<UpdateProfileOutcome> UpdateAsync(
        Guid userId, ProfileUpdate update, DateTime now, DateTime usernameAllowedSince,
        CancellationToken cancellationToken = default)
    {
        var touchesProfile = update.SetAbout || update.SetAccentColor;
        if (touchesProfile)
        {
            await db.Database.ExecuteSqlInterpolatedAsync(
                $"""INSERT INTO user_profiles ("UserId", "UpdatedAt") VALUES ({userId}, {now}) ON CONFLICT DO NOTHING""",
                cancellationToken);
        }

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            if (update.Name is { } name)
            {
                await db.Users.Where(u => u.Id == userId)
                    .ExecuteUpdateAsync(s => s.SetProperty(u => u.Name, name), cancellationToken);
            }

            if (update.Username is { } username)
            {
                var changed = await db.Users
                    .Where(u => u.Id == userId && (u.UsernameChangedAt == null || u.UsernameChangedAt <= usernameAllowedSince))
                    .ExecuteUpdateAsync(s => s
                        .SetProperty(u => u.Username, username)
                        .SetProperty(u => u.UsernameChangedAt, (DateTime?)now), cancellationToken);

                if (changed == 0)
                {
                    await transaction.RollbackAsync(cancellationToken);
                    return UpdateProfileOutcome.UsernameTooSoon;
                }
            }

            if (update.SetAbout)
            {
                var about = update.About;
                await db.UserProfiles.Where(p => p.UserId == userId).ExecuteUpdateAsync(s => s
                    .SetProperty(p => p.About, about)
                    .SetProperty(p => p.UpdatedAt, now), cancellationToken);
            }

            if (update.SetAccentColor)
            {
                var color = update.AccentColor;
                await db.UserProfiles.Where(p => p.UserId == userId).ExecuteUpdateAsync(s => s
                    .SetProperty(p => p.AccentColor, color)
                    .SetProperty(p => p.UpdatedAt, now), cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
            return UpdateProfileOutcome.Updated;
        }
        catch (Exception ex) when (IsUniqueViolation(ex))
        {
            return UpdateProfileOutcome.UsernameTaken;
        }
    }

    public Task SaveImageAsync(
        Guid userId, ProfileImageKind kind, byte[] data, string contentType, CancellationToken cancellationToken = default) =>
        MutateAsync(userId, profile =>
        {
            if (kind == ProfileImageKind.Avatar)
            {
                profile.AvatarData = data;
                profile.AvatarContentType = contentType;
            }
            else
            {
                profile.BannerData = data;
                profile.BannerContentType = contentType;
            }
        }, cancellationToken);

    public async Task RemoveImageAsync(Guid userId, ProfileImageKind kind, CancellationToken cancellationToken = default)
    {
        var query = db.UserProfiles.Where(p => p.UserId == userId);
        var now = DateTime.UtcNow;

        if (kind == ProfileImageKind.Avatar)
        {
            await query.Where(p => p.AvatarData != null).ExecuteUpdateAsync(s => s
                .SetProperty(p => p.AvatarData, (byte[]?)null)
                .SetProperty(p => p.AvatarContentType, (string?)null)
                .SetProperty(p => p.UpdatedAt, now), cancellationToken);
        }
        else
        {
            await query.Where(p => p.BannerData != null).ExecuteUpdateAsync(s => s
                .SetProperty(p => p.BannerData, (byte[]?)null)
                .SetProperty(p => p.BannerContentType, (string?)null)
                .SetProperty(p => p.UpdatedAt, now), cancellationToken);
        }
    }

    public async Task<ProfileImage?> GetImageAsync(
        Guid userId, ProfileImageKind kind, CancellationToken cancellationToken = default)
    {
        var query = db.UserProfiles.AsNoTracking().Where(p => p.UserId == userId);

        var row = kind == ProfileImageKind.Avatar
            ? await query.Where(p => p.AvatarData != null)
                .Select(p => new ProfileImage(p.AvatarData!, p.AvatarContentType!, p.UpdatedAt))
                .FirstOrDefaultAsync(cancellationToken)
            : await query.Where(p => p.BannerData != null)
                .Select(p => new ProfileImage(p.BannerData!, p.BannerContentType!, p.UpdatedAt))
                .FirstOrDefaultAsync(cancellationToken);

        return row;
    }

    private static bool IsUniqueViolation(Exception ex) =>
        (ex as PostgresException ?? ex.InnerException as PostgresException) is { SqlState: PostgresErrorCodes.UniqueViolation };

    private async Task MutateAsync(Guid userId, Action<UserProfile> change, CancellationToken cancellationToken)
    {
        for (var attempt = 0; ; attempt++)
        {
            var profile = await db.UserProfiles.FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);
            var isNew = profile is null;
            profile ??= db.UserProfiles.Add(new UserProfile { UserId = userId }).Entity;

            change(profile);
            profile.UpdatedAt = DateTime.UtcNow;

            try
            {
                await db.SaveChangesAsync(cancellationToken);
                return;
            }
            catch (DbUpdateException ex) when (isNew && attempt == 0
                && ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
            {
                db.Entry(profile).State = EntityState.Detached;
            }
        }
    }
}
