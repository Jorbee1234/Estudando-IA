namespace Api.Domain;

public sealed class Tag
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string Name { get; init; }

    /// <summary>Lower-cased, trimmed name used for lookups and the unique index.</summary>
    public required string NormalizedName { get; init; }

    public List<PostTag> PostTags { get; init; } = [];

    public static string Normalize(string name) => name.Trim().ToLowerInvariant();
}
