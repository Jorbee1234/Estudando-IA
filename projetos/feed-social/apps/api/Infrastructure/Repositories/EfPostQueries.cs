using Api.Application.Abstractions;
using Api.Application.Common;
using Api.Application.Models;
using Api.Domain;
using Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Infrastructure.Repositories;

public sealed class EfPostQueries(AppDbContext db) : IPostQueries
{
    private sealed record PostRow(
        Guid Id, string Title, string Description, string? ThumbnailUrl, DateTime CreatedAt,
        int LikesCount, int CommentsCount, Guid AuthorId, string AuthorName, string AuthorUsername,
        DateTime? AvatarUpdatedAt, List<string> Tags, bool LikedByMe);

    public async Task<Page<PostView>> ListAsync(
        PostFilter filter, FeedCursor? cursor, Guid? userId, CancellationToken cancellationToken = default)
    {
        IQueryable<Post> posts = db.Posts.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(filter.Q))
        {
            var pattern = $"%{PostgresText.EscapeLike(filter.Q.Trim())}%";
            posts = posts.Where(p =>
                EF.Functions.ILike(p.Title, pattern, "\\") || EF.Functions.ILike(p.Description, pattern, "\\"));
        }

        if (filter.AuthorId is { } authorId)
        {
            posts = posts.Where(p => p.AuthorId == authorId);
        }

        foreach (var tag in filter.Tags.Where(t => !string.IsNullOrWhiteSpace(t)).Select(Tag.Normalize).Distinct())
        {
            posts = posts.Where(p => p.PostTags.Any(pt => pt.Tag!.NormalizedName == tag));
        }

        var popular = filter.Sort == FeedCursor.Popular;

        if (cursor is not null)
        {
            var (createdAt, id, likes) = (cursor.CreatedAt, cursor.Id, cursor.Likes ?? 0);
            posts = popular
                ? posts.Where(p => p.LikesCount < likes
                    || (p.LikesCount == likes && p.CreatedAt < createdAt)
                    || (p.LikesCount == likes && p.CreatedAt == createdAt && p.Id.CompareTo(id) < 0))
                : posts.Where(p => p.CreatedAt < createdAt
                    || (p.CreatedAt == createdAt && p.Id.CompareTo(id) < 0));
        }

        posts = popular
            ? posts.OrderByDescending(p => p.LikesCount).ThenByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id)
            : posts.OrderByDescending(p => p.CreatedAt).ThenByDescending(p => p.Id);

        var rows = await Project(posts, userId).Take(filter.Limit + 1).ToListAsync(cancellationToken);

        string? next = null;
        if (rows.Count > filter.Limit)
        {
            rows.RemoveAt(rows.Count - 1);
            var last = rows[^1];
            next = new FeedCursor(filter.Sort, last.CreatedAt, last.Id, popular ? last.LikesCount : null).Encode();
        }

        return new Page<PostView>(rows.Select(ToView).ToList(), next);
    }

    public async Task<PostView?> GetAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default)
    {
        var row = await Project(db.Posts.AsNoTracking().Where(p => p.Id == id), userId)
            .FirstOrDefaultAsync(cancellationToken);
        return row is null ? null : ToView(row);
    }

    private IQueryable<PostRow> Project(IQueryable<Post> posts, Guid? userId)
    {
        var uid = userId ?? Guid.Empty;
        return posts.Select(p => new PostRow(
            p.Id, p.Title, p.Description, p.ThumbnailUrl, p.CreatedAt,
            p.LikesCount, p.CommentsCount, p.AuthorId, p.Author!.Name, p.Author!.Username,
            db.UserProfiles
                .Where(up => up.UserId == p.AuthorId && up.AvatarData != null)
                .Select(up => (DateTime?)up.UpdatedAt)
                .FirstOrDefault(),
            p.PostTags.Select(pt => pt.Tag!.Name).OrderBy(n => n).ToList(),
            db.PostLikes.Any(l => l.PostId == p.Id && l.UserId == uid)));
    }

    private static PostView ToView(PostRow row) =>
        new(row.Id, row.Title, row.Description, row.ThumbnailUrl, row.Tags,
            row.LikesCount, row.CommentsCount, row.LikedByMe, row.CreatedAt,
            new AuthorView(row.AuthorId, row.AuthorName, row.AuthorUsername, row.AvatarUpdatedAt?.Ticks));
}
