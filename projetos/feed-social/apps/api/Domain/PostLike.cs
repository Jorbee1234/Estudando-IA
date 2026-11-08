namespace Api.Domain;

/// <summary>A user's like on a post. The composite key guarantees one like per user.</summary>
public sealed class PostLike
{
    public Guid PostId { get; init; }
    public Guid UserId { get; init; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}
