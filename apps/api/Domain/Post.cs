namespace Api.Domain;

/// <summary>Internal post entity. Never exposed directly; use <c>PostResponse</c>.</summary>
public sealed class Post
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid AuthorId { get; init; }
    public User? Author { get; init; }

    public required string Title { get; init; }
    public required string Description { get; init; }

    /// <summary>Optional cover image. When null the clients render a generated placeholder.</summary>
    public string? ThumbnailUrl { get; init; }

    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;

    /// <summary>Denormalized counters, updated in the same transaction as the like/comment.</summary>
    public int LikesCount { get; set; }
    public int CommentsCount { get; set; }

    public List<PostTag> PostTags { get; init; } = [];
}
