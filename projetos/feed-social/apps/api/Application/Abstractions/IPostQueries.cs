using Api.Application.Common;
using Api.Application.Models;

namespace Api.Application.Abstractions;

public interface IPostQueries
{
    Task<Page<PostView>> ListAsync(
        PostFilter filter, FeedCursor? cursor, Guid? userId, CancellationToken cancellationToken = default);

    Task<PostView?> GetAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default);
}
