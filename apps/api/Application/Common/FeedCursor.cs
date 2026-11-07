using System.Buffers.Text;
using System.Text.Json;

namespace Api.Application.Common;

public sealed record FeedCursor(string Sort, DateTime CreatedAt, Guid Id, int? Likes)
{
    public const string Recent = "recent";
    public const string Popular = "popular";

    public string Encode() => Base64Url.EncodeToString(JsonSerializer.SerializeToUtf8Bytes(this));

    public static bool TryDecode(string? value, string expectedSort, out FeedCursor? cursor)
    {
        cursor = null;
        if (string.IsNullOrEmpty(value))
        {
            return true;
        }

        try
        {
            cursor = JsonSerializer.Deserialize<FeedCursor>(Base64Url.DecodeFromChars(value));
        }
        catch (Exception ex) when (ex is JsonException or FormatException)
        {
            return false;
        }

        if (cursor is null || cursor.Sort != expectedSort || (expectedSort == Popular && cursor.Likes is null))
        {
            cursor = null;
            return false;
        }

        cursor = cursor with { CreatedAt = DateTime.SpecifyKind(cursor.CreatedAt, DateTimeKind.Utc) };
        return true;
    }
}
