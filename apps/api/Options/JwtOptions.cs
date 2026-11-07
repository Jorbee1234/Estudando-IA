using System.ComponentModel.DataAnnotations;

namespace Api.Options;

public sealed class JwtOptions
{
    [Required]
    public string Issuer { get; init; } = string.Empty;

    [Required]
    public string Audience { get; init; } = string.Empty;

    /// <summary>HMAC-SHA256 key; at least 32 characters. Provide via environment in production.</summary>
    [Required, MinLength(32)]
    public string SecretKey { get; init; } = string.Empty;

    [Range(1, 1440)]
    public int ExpirationMinutes { get; init; } = 60;
}
