namespace Api.Domain;

/// <summary>Internal user entity. Never exposed directly; use <c>UserResponse</c>.</summary>
public sealed class User
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required string Name { get; init; }
    public required string Email { get; init; }

    /// <summary>Unique lower-case @-handle (see <see cref="Domain.Username"/>).</summary>
    public required string Username { get; init; }

    /// <summary>When the username was last changed by the user; null if never.</summary>
    public DateTime? UsernameChangedAt { get; init; }

    /// <summary>Lower-cased, trimmed e-mail used for lookups and the unique index.</summary>
    public string NormalizedEmail { get; init; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public const int NameMinLength = 2;
    public const int NameMaxLength = 100;

    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    /// <summary>Trims the display name. Returns an empty string for null.</summary>
    public static string NormalizeName(string? name) => (name ?? string.Empty).Trim();

    public static bool IsValidName(string normalizedName) =>
        normalizedName.Length is >= NameMinLength and <= NameMaxLength;
}
