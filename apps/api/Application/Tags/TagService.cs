using Api.Application.Abstractions;
using Api.Application.Models;

namespace Api.Application.Tags;

public sealed class TagService(ITagRepository tags)
{
    private const int Limit = 50;

    public Task<IReadOnlyList<TagView>> ListAsync(string? query, CancellationToken cancellationToken = default) =>
        tags.ListAsync(query, Limit, cancellationToken);
}
