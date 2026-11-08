using System.Text;
using System.Text.RegularExpressions;

namespace Api.Domain;

public static partial class Username
{
    public const int MinLength = 3;
    public const int MaxLength = 30;

    private const int GeneratedMaxLength = 22;
    private const int SequentialAttempts = 5;

    public static readonly TimeSpan ChangeInterval = TimeSpan.FromDays(30);

    private static readonly HashSet<string> Reserved =
    [
        "me", "admin", "administrator", "root", "api", "system", "support", "null", "undefined",
    ];

    /// <summary>Trims and lower-cases. Returns an empty string for null.</summary>
    public static string Normalize(string? value) => (value ?? string.Empty).Trim().ToLowerInvariant();

    public static bool IsReserved(string username) => Reserved.Contains(username);

    /// <summary>Expects a normalized value: 3 to 30 letters, digits or underscores, not reserved.</summary>
    public static bool IsValid(string username) =>
        username.Length is >= MinLength and <= MaxLength && Allowed().IsMatch(username) && !IsReserved(username);

    /// <summary>Builds the initial username from the first word of the name (accents removed).</summary>
    public static string FromName(string name)
    {
        var first = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? string.Empty;
        var decomposed = first.Normalize(NormalizationForm.FormD);
        var ascii = NotAllowed().Replace(decomposed, string.Empty).ToLowerInvariant();

        if (ascii.Length < MinLength)
        {
            ascii = $"user{ascii}";
        }

        return ascii.Length > GeneratedMaxLength ? ascii[..GeneratedMaxLength] : ascii;
    }

    /// <summary>
    /// Attempt 1 is the base itself, attempts 2 to 5 add <c>_2</c>...<c>_5</c> and later ones a random number
    /// (<c>_48213</c>), so common names such as "maria" never run out of candidates.
    /// </summary>
    public static string WithSuffix(string baseName, int attempt) => attempt switch
    {
        <= 1 => baseName,
        <= SequentialAttempts => $"{baseName}_{attempt}",
        _ => $"{baseName}_{Random.Shared.Next(1_000, 1_000_000)}",
    };

    /// <summary>When the user may change the username again, or null if they may do it now.</summary>
    public static DateTime? NextChangeAt(DateTime? changedAt, DateTime now) =>
        changedAt is { } at && at + ChangeInterval > now ? at + ChangeInterval : null;

    [GeneratedRegex("^[a-z0-9_]+$")]
    private static partial Regex Allowed();

    [GeneratedRegex("[^a-zA-Z0-9]")]
    private static partial Regex NotAllowed();
}
