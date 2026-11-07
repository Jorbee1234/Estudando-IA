using Api.Application.Models;
using Api.Domain;

namespace Api.Application.Abstractions;

public interface ITagRepository
{
    Task<IReadOnlyList<Tag>> GetOrCreateAsync(IReadOnlyList<string> names, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TagView>> ListAsync(string? query, int limit, CancellationToken cancellationToken = default);
}
