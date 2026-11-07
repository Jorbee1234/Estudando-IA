using Api.Application.Abstractions;
using Api.Application.Common;
using Api.Application.Models;
using Api.Domain;

namespace Api.Application.Comments;

public sealed class CommentService(
    ICommentRepository comments, IPostRepository posts, IUserStore users, IProfileRepository profiles)
{
    private const string BodyField = "Body";

    public async Task<Result<Page<CommentView>>> ListAsync(
        Guid postId, string? cursor, int limit, CancellationToken cancellationToken = default)
    {
        if (!FeedCursor.TryDecode(cursor, FeedCursor.Recent, out var decoded))
        {
            return Errors.InvalidCursor;
        }

        if (!await posts.ExistsAsync(postId, cancellationToken))
        {
            return Errors.PostNotFound;
        }

        return await comments.ListAsync(postId, decoded, limit, cancellationToken);
    }

    public async Task<Result<CommentView>> AddAsync(
        Guid? userId, Guid postId, string body, CancellationToken cancellationToken = default)
    {
        if (userId is not { } authorId || await users.FindByIdAsync(authorId, cancellationToken) is not { } author)
        {
            return Errors.Unauthenticated;
        }

        if (!await posts.ExistsAsync(postId, cancellationToken))
        {
            return Errors.PostNotFound;
        }

        var text = body.Trim();
        if (text.Length == 0)
        {
            return Errors.CommentEmpty(BodyField);
        }

        var comment = new Comment { PostId = postId, AuthorId = authorId, Body = text };
        await comments.AddAsync(comment, cancellationToken);

        return new CommentView(
            comment.Id, comment.Body, comment.CreatedAt,
            new AuthorView(
                author.Id, author.Name, author.Username,
                await profiles.GetAvatarVersionAsync(author.Id, cancellationToken)));
    }
}
