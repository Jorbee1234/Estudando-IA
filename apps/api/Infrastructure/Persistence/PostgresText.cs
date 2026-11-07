namespace Api.Infrastructure.Persistence;

public static class PostgresText
{
    public static string EscapeLike(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");
}
