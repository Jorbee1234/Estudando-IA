namespace Api.Domain;

public sealed class Comment
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid PostId { get; init; }
    public Guid AuthorId { get; init; }
    public User? Author { get; init; }

    public required string Body { get; init; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}
