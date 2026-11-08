using Api.Application.Common;
using Api.Application.Models;
using Api.Domain;

namespace Api.Application.Abstractions;

public interface ICommentRepository
{
    Task<Page<CommentView>> ListAsync(
        Guid postId, FeedCursor? cursor, int limit, CancellationToken cancellationToken = default);

    Task AddAsync(Comment comment, CancellationToken cancellationToken = default);
}
