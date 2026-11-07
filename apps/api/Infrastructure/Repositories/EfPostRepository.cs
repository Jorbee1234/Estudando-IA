using Api.Application.Abstractions;
using Api.Domain;
using Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Api.Infrastructure.Repositories;

public sealed class EfPostRepository(AppDbContext db) : IPostRepository
{
    public Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default) =>
        db.Posts.AnyAsync(p => p.Id == id, cancellationToken);

    public async Task AddAsync(Post post, CancellationToken cancellationToken = default)
    {
        db.Posts.Add(post);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> AddLikeAsync(Guid postId, Guid userId, CancellationToken cancellationToken = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var inserted = await db.Database.ExecuteSqlInterpolatedAsync(
            $"""INSERT INTO post_likes ("PostId", "UserId", "CreatedAt") VALUES ({postId}, {userId}, {DateTime.UtcNow}) ON CONFLICT DO NOTHING""",
            cancellationToken);
        if (inserted == 1)
        {
            await db.Posts.Where(p => p.Id == postId)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.LikesCount, p => p.LikesCount + 1), cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return inserted == 1;
    }

    public async Task<bool> RemoveLikeAsync(Guid postId, Guid userId, CancellationToken cancellationToken = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var deleted = await db.PostLikes
            .Where(l => l.PostId == postId && l.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
        if (deleted == 1)
        {
            await db.Posts.Where(p => p.Id == postId)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.LikesCount, p => p.LikesCount - 1), cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return deleted == 1;
    }
}
