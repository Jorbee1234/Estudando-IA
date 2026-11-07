using System.ComponentModel.DataAnnotations;

namespace Api.Dtos;

/// <summary>Credentials used to obtain an access token.</summary>
public sealed class CreateTokenRequest
{
    /// <example>maria@example.com</example>
    [Required, EmailAddress, StringLength(254)]
    public string Email { get; init; } = string.Empty;

    /// <example>Senha@1234</example>
    [Required, StringLength(128)]
    public string Password { get; init; } = string.Empty;
}
