using Api.Application.Abstractions;
using Api.Application.Common;
using Api.Application.Models;
using Api.Domain;
using Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Infrastructure.Repositories;

public sealed class EfCommentRepository(AppDbContext db) : ICommentRepository
{
    public async Task<Page<CommentView>> ListAsync(
        Guid postId, FeedCursor? cursor, int limit, CancellationToken cancellationToken = default)
    {
        IQueryable<Comment> comments = db.Comments.AsNoTracking().Where(c => c.PostId == postId);
        if (cursor is not null)
        {
            var (createdAt, id) = (cursor.CreatedAt, cursor.Id);
            comments = comments.Where(c => c.CreatedAt < createdAt
                || (c.CreatedAt == createdAt && c.Id.CompareTo(id) < 0));
        }

        var rows = await comments
            .OrderByDescending(c => c.CreatedAt).ThenByDescending(c => c.Id)
            .Take(limit + 1)
            .Select(c => new
            {
                c.Id, c.Body, c.CreatedAt, c.AuthorId,
                AuthorName = c.Author!.Name,
                AuthorUsername = c.Author!.Username,
                AvatarUpdatedAt = db.UserProfiles
                    .Where(up => up.UserId == c.AuthorId && up.AvatarData != null)
                    .Select(up => (DateTime?)up.UpdatedAt)
                    .FirstOrDefault(),
            })
            .ToListAsync(cancellationToken);

        string? next = null;
        if (rows.Count > limit)
        {
            rows.RemoveAt(rows.Count - 1);
            var last = rows[^1];
            next = new FeedCursor(FeedCursor.Recent, last.CreatedAt, last.Id, null).Encode();
        }

        var items = rows
            .Select(r => new CommentView(
                r.Id, r.Body, r.CreatedAt,
                new AuthorView(r.AuthorId, r.AuthorName, r.AuthorUsername, r.AvatarUpdatedAt?.Ticks)))
            .ToList();

        return new Page<CommentView>(items, next);
    }

    public async Task AddAsync(Comment comment, CancellationToken cancellationToken = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        db.Comments.Add(comment);
        await db.SaveChangesAsync(cancellationToken);
        await db.Posts.Where(p => p.Id == comment.PostId)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.CommentsCount, p => p.CommentsCount + 1), cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }
}
