namespace Api.Application.Models;

public sealed record AuthorView(Guid Id, string Name, string Handle, long? AvatarVersion = null);

public sealed record PostView(
    Guid Id,
    string Title,
    string Description,
    string? ThumbnailUrl,
    IReadOnlyList<string> Tags,
    int LikesCount,
    int CommentsCount,
    bool LikedByMe,
    DateTime CreatedAt,
    AuthorView Author);

public sealed record CommentView(Guid Id, string Body, DateTime CreatedAt, AuthorView Author);

public sealed record TagView(string Name, int PostsCount);

public sealed record Page<T>(IReadOnlyList<T> Items, string? NextCursor);

public sealed record PostFilter(
    string? Q, IReadOnlyList<string> Tags, string Sort, string? Cursor, int Limit, Guid? AuthorId = null);

public sealed record NewPost(string Title, string Description, string? ThumbnailUrl, IReadOnlyList<string> Tags);

public sealed record AccessToken(string Token, int ExpiresInSeconds);
