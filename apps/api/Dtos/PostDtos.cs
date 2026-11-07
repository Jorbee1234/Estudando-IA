using System.ComponentModel.DataAnnotations;

namespace Api.Dtos;

/// <summary>Public data of a post's or comment's author.</summary>
/// <param name="Id">Author id.</param>
/// <param name="Name">Display name.</param>
/// <param name="Handle">The author's unique @username (without the "@").</param>
/// <param name="AvatarUrl">URL of the author's profile picture; null when none was uploaded.</param>
public sealed record AuthorResponse(Guid Id, string Name, string Handle, string? AvatarUrl);

/// <summary>A post as shown in the feed and in the post details.</summary>
public sealed record PostResponse(
    Guid Id,
    string Title,
    string Description,
    string? ThumbnailUrl,
    IReadOnlyList<string> Tags,
    int LikesCount,
    int CommentsCount,
    bool LikedByMe,
    DateTime CreatedAt,
    AuthorResponse Author,
    IReadOnlyList<Link> Links);

/// <summary>A comment on a post.</summary>
public sealed record CommentResponse(
    Guid Id,
    string Body,
    DateTime CreatedAt,
    AuthorResponse Author,
    IReadOnlyList<Link> Links);

/// <summary>A tag with the number of posts using it.</summary>
public sealed record TagResponse(string Name, int PostsCount);

/// <summary>A page of results. <paramref name="NextCursor"/> is null on the last page.</summary>
public sealed record PagedResponse<T>(IReadOnlyList<T> Items, string? NextCursor, IReadOnlyList<Link> Links);

/// <summary>Data required to publish a post.</summary>
public sealed class CreatePostRequest
{
    /// <example>Landing page responsiva com React</example>
    [Required, StringLength(120, MinimumLength = 3)]
    public string Title { get; init; } = string.Empty;

    [Required, StringLength(2000, MinimumLength = 1)]
    public string Description { get; init; } = string.Empty;

    /// <summary>Optional http(s) URL of the cover image.</summary>
    [StringLength(2048)]
    public string? ThumbnailUrl { get; init; }

    /// <summary>Up to 5 tags, each up to 30 characters.</summary>
    [MaxLength(5)]
    public List<string> Tags { get; init; } = [];
}

/// <summary>Data required to comment on a post.</summary>
public sealed class CreateCommentRequest
{
    [Required, StringLength(1000, MinimumLength = 1)]
    public string Body { get; init; } = string.Empty;
}

/// <summary>Query string of <c>GET /api/posts</c>.</summary>
public sealed class ListPostsQuery
{
    /// <summary>Free text matched against title and description (case-insensitive).</summary>
    [StringLength(100)]
    public string? Q { get; init; }

    /// <summary>Repeat the parameter to filter by several tags; a post must have all of them.</summary>
    public List<string> Tags { get; init; } = [];

    /// <summary>Only posts published by this user.</summary>
    public Guid? AuthorId { get; init; }

    /// <summary><c>recent</c> (default) or <c>popular</c>.</summary>
    [RegularExpression("^(recent|popular)$", ErrorMessage = Api.Application.Common.Messages.InvalidSort)]
    public string Sort { get; init; } = "recent";

    /// <summary>Opaque cursor returned as <c>nextCursor</c> by the previous page.</summary>
    [StringLength(512)]
    public string? Cursor { get; init; }

    /// <summary>Page size, between 1 and 50.</summary>
    [Range(1, 50)]
    public int Limit { get; init; } = 12;
}

/// <summary>Query string of paginated sub-collections such as comments.</summary>
public sealed class PageQuery
{
    [StringLength(512)]
    public string? Cursor { get; init; }

    [Range(1, 50)]
    public int Limit { get; init; } = 20;
}
