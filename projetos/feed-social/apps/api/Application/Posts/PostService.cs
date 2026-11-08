using Api.Application.Abstractions;
using Api.Application.Common;
using Api.Application.Models;
using Api.Domain;

namespace Api.Application.Posts;

public sealed class PostService(
    IPostQueries queries,
    IPostRepository posts,
    ITagRepository tags,
    IUserStore users)
{
    private const int MaxTagLength = 30;

    public async Task<Result<Page<PostView>>> ListAsync(
        PostFilter filter, Guid? userId, CancellationToken cancellationToken = default)
    {
        if (!FeedCursor.TryDecode(filter.Cursor, filter.Sort, out var cursor))
        {
            return Errors.InvalidCursor;
        }

        return await queries.ListAsync(filter, cursor, userId, cancellationToken);
    }

    public async Task<Result<PostView>> GetAsync(Guid id, Guid? userId, CancellationToken cancellationToken = default) =>
        await queries.GetAsync(id, userId, cancellationToken) is { } post ? post : Errors.PostNotFound;

    public async Task<Result<PostView>> CreateAsync(
        Guid? userId, NewPost request, CancellationToken cancellationToken = default)
    {
        if (userId is not { } authorId || await users.FindByIdAsync(authorId, cancellationToken) is null)
        {
            return Errors.Unauthenticated;
        }

        var thumbnail = string.IsNullOrWhiteSpace(request.ThumbnailUrl) ? null : request.ThumbnailUrl.Trim();
        var names = request.Tags
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t.Trim())
            .DistinctBy(Tag.Normalize)
            .ToList();

        if (Validate(thumbnail, names) is { } invalid)
        {
            return invalid;
        }

        var resolved = await tags.GetOrCreateAsync(names, cancellationToken);
        var post = new Post
        {
            AuthorId = authorId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            ThumbnailUrl = thumbnail,
            PostTags = resolved.Select(t => new PostTag { Tag = t }).ToList(),
        };
        await posts.AddAsync(post, cancellationToken);

        return await queries.GetAsync(post.Id, authorId, cancellationToken)
            ?? throw new InvalidOperationException("The post was created but could not be read back.");
    }

    public async Task<Result> LikeAsync(Guid? userId, Guid postId, CancellationToken cancellationToken = default)
    {
        if (userId is not { } id)
        {
            return Errors.Unauthenticated;
        }

        if (!await posts.ExistsAsync(postId, cancellationToken))
        {
            return Errors.PostNotFound;
        }

        await posts.AddLikeAsync(postId, id, cancellationToken);
        return Result.Success;
    }

    public async Task<Result> UnlikeAsync(Guid? userId, Guid postId, CancellationToken cancellationToken = default)
    {
        if (userId is not { } id)
        {
            return Errors.Unauthenticated;
        }

        if (!await posts.ExistsAsync(postId, cancellationToken))
        {
            return Errors.PostNotFound;
        }

        await posts.RemoveLikeAsync(postId, id, cancellationToken);
        return Result.Success;
    }

    private static AppError? Validate(string? thumbnail, List<string> names)
    {
        var fields = new Dictionary<string, string[]>();
        AppError? first = null;

        if (thumbnail is not null
            && !(Uri.TryCreate(thumbnail, UriKind.Absolute, out var uri) && uri.Scheme is "http" or "https"))
        {
            first = Errors.InvalidThumbnail(nameof(NewPost.ThumbnailUrl));
            fields[nameof(NewPost.ThumbnailUrl)] = [Messages.InvalidThumbnail];
        }

        if (names.Any(n => n.Length > MaxTagLength))
        {
            first ??= Errors.TagTooLong(nameof(NewPost.Tags));
            fields[nameof(NewPost.Tags)] = [Messages.TagTooLong];
        }

        return first is null ? null : first with { Fields = fields };
    }
}
