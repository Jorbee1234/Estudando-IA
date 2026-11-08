namespace Api.Dtos;

/// <summary>Representation of a user.</summary>
public sealed record UserResponse(Guid Id, string Name, string Email, IReadOnlyList<Link> Links);
