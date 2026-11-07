using System.Text.RegularExpressions;
using Api.Infrastructure.Persistence;
using Api.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using Xunit;

namespace Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class UsernameMigrationTests(ApiFactory factory)
{
    private const string PreviousMigration = "20261107175759_AddUserProfiles";

    [Fact]
    public async Task Backfill_gives_every_existing_user_a_unique_ascii_username()
    {
        var database = $"migration_{Guid.NewGuid():N}";
        await using (var admin = new NpgsqlConnection(factory.ConnectionString))
        {
            await admin.OpenAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE \"{database}\"", admin);
            await create.ExecuteNonQueryAsync();
        }

        var connection = new NpgsqlConnectionStringBuilder(factory.ConnectionString) { Database = database };
        var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connection.ConnectionString).Options;
        await using var db = new AppDbContext(options);
        var migrator = db.GetService<IMigrator>();

        await migrator.MigrateAsync(PreviousMigration);
        string[] names = ["Júlio Costa", "Julio Souza", "ÁNA Maria", "Zé", "!!!", "Maria Silva", "Maria Lima", "  "];
        foreach (var (name, index) in names.Select((n, i) => (n, i)))
        {
            await db.Database.ExecuteSqlRawAsync(
                """INSERT INTO users ("Id", "Name", "Email", "NormalizedEmail", "PasswordHash") VALUES ({0}, {1}, {2}, {2}, 'x')""",
                Guid.NewGuid(), name, $"u{index}@example.com");
        }

        await migrator.MigrateAsync();

        var rows = await db.Database
            .SqlQuery<string>($"""SELECT "Username" AS "Value" FROM users""")
            .ToListAsync();

        Assert.Equal(names.Length, rows.Count);
        Assert.Equal(rows.Count, rows.Distinct().Count());
        Assert.All(rows, username => Assert.Matches(new Regex("^[a-z0-9_]{3,30}$"), username));
        Assert.Equal(["julio", "julio_2"], rows.Where(u => u.StartsWith("julio")).Order().ToArray());
        Assert.Contains("ana", rows);
        Assert.Contains("userze", rows);
        Assert.Equal(["maria", "maria_2"], rows.Where(u => u.StartsWith("maria")).Order().ToArray());
        Assert.Equal(2, rows.Count(u => u.StartsWith("user") && u != "userze"));
    }
}
