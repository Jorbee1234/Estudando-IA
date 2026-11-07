using Api.Application.Abstractions;
using Api.Application.Models;
using Api.Domain;
using Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Api.Infrastructure.Repositories;

public sealed class EfTagRepository(AppDbContext db) : ITagRepository
{
    private const int MaxAttempts = 3;

    public async Task<IReadOnlyList<Tag>> GetOrCreateAsync(
        IReadOnlyList<string> names, CancellationToken cancellationToken = default)
    {
        if (names.Count == 0)
        {
            return [];
        }

        var normalized = names.Select(Tag.Normalize).ToList();

        for (var attempt = 1; ; attempt++)
        {
            var existing = await db.Tags
                .Where(t => normalized.Contains(t.NormalizedName))
                .ToListAsync(cancellationToken);

            var missing = names
                .Where(n => existing.All(t => t.NormalizedName != Tag.Normalize(n)))
                .Select(n => new Tag { Name = n, NormalizedName = Tag.Normalize(n) })
                .ToList();
            if (missing.Count == 0)
            {
                return existing;
            }

            db.Tags.AddRange(missing);
            try
            {
                await db.SaveChangesAsync(cancellationToken);
                return [.. existing, .. missing];
            }
            catch (DbUpdateException ex)
                when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation }
                    && attempt < MaxAttempts)
            {
                foreach (var tag in missing)
                {
                    db.Entry(tag).State = EntityState.Detached;
                }
            }
        }
    }

    public async Task<IReadOnlyList<TagView>> ListAsync(
        string? query, int limit, CancellationToken cancellationToken = default)
    {
        var tags = db.Tags.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var pattern = $"%{PostgresText.EscapeLike(query.Trim())}%";
            tags = tags.Where(t => EF.Functions.ILike(t.Name, pattern, "\\"));
        }

        return await tags
            .OrderByDescending(t => t.PostTags.Count).ThenBy(t => t.Name)
            .Take(limit)
            .Select(t => new TagView(t.Name, t.PostTags.Count))
            .ToListAsync(cancellationToken);
    }
}
