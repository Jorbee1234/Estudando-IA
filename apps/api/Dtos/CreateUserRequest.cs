using System.ComponentModel.DataAnnotations;

namespace Api.Dtos;

/// <summary>Data required to register a user.</summary>
public sealed class CreateUserRequest
{
    /// <summary>Full name.</summary>
    /// <example>Maria Silva</example>
    [Required, StringLength(100, MinimumLength = 2)]
    public string Name { get; init; } = string.Empty;

    /// <summary>E-mail, unique per user (case-insensitive).</summary>
    /// <example>maria@example.com</example>
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; init; } = string.Empty;

    /// <summary>Password, at least 8 characters.</summary>
    /// <example>Senha@1234</example>
    [Required, StringLength(128, MinimumLength = 8)]
    public string Password { get; init; } = string.Empty;
}
