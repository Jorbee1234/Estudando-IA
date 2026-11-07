namespace Api.Models;

/// <summary>Internal user entity. Never exposed directly; use <c>UserResponse</c>.</summary>
public sealed class User
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string Name { get; init; }
    public required string Email { get; init; }
    public string PasswordHash { get; set; } = string.Empty;
}
