namespace Api.Application.Profiles;

public static class ImageSignature
{
    /// <summary>Detects PNG, JPEG or WebP from the file's first bytes. Returns the content type or null.</summary>
    public static string? Detect(ReadOnlySpan<byte> data)
    {
        ReadOnlySpan<byte> png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        if (data.Length >= 8 && data[..8].SequenceEqual(png))
        {
            return "image/png";
        }

        if (data.Length >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF)
        {
            return "image/jpeg";
        }

        if (data.Length >= 12 && data[..4].SequenceEqual("RIFF"u8) && data[8..12].SequenceEqual("WEBP"u8))
        {
            return "image/webp";
        }

        return null;
    }
}
