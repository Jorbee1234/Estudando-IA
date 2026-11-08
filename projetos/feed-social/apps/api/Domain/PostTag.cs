namespace Api.Domain;

/// <summary>Join entity of the many-to-many relation between posts and tags.</summary>
public sealed class PostTag
{
    public Guid PostId { get; init; }
    public Post? Post { get; init; }

    public Guid TagId { get; init; }
    public Tag? Tag { get; init; }
}
