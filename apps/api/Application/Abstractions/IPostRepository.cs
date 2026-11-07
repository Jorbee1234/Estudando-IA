using Api.Domain;

namespace Api.Application.Abstractions;

public interface IPostRepository
{
    Task<bool> ExistsAsync(Guid id, CancellationToken cancellationToken = default);

    Task AddAsync(Post post, CancellationToken cancellationToken = default);

    Task<bool> AddLikeAsync(Guid postId, Guid userId, CancellationToken cancellationToken = default);

    Task<bool> RemoveLikeAsync(Guid postId, Guid userId, CancellationToken cancellationToken = default);
}
