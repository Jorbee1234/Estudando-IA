using System.Text.RegularExpressions;

namespace Api.Domain;

public static partial class AccentColor
{
    public const double MinContrast = 3.0;

    private const double BackgroundLuminance = 0.0023;

    public static bool TryNormalize(string? value, out string? normalized)
    {
        normalized = null;
        if (string.IsNullOrWhiteSpace(value))
        {
            return true;
        }

        var trimmed = value.Trim();
        if (!HexColor().IsMatch(trimmed))
        {
            return false;
        }

        normalized = trimmed.ToUpperInvariant();
        return true;
    }

    /// <summary>WCAG contrast ratio of a <c>#RRGGBB</c> color against the dark page background (#00090E).</summary>
    public static double ContrastAgainstBackground(string hex)
    {
        var luminance = 0.2126 * Channel(hex, 1) + 0.7152 * Channel(hex, 3) + 0.0722 * Channel(hex, 5);
        return (luminance + 0.05) / (BackgroundLuminance + 0.05);
    }

    public static bool HasEnoughContrast(string hex) => ContrastAgainstBackground(hex) >= MinContrast;

    private static double Channel(string hex, int start)
    {
        var value = Convert.ToInt32(hex.Substring(start, 2), 16) / 255.0;
        return value <= 0.03928 ? value / 12.92 : Math.Pow((value + 0.055) / 1.055, 2.4);
    }

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex HexColor();
}
