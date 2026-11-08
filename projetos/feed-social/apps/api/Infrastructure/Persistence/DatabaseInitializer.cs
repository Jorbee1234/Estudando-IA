using Api.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Api.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static async Task MigrateAndSeedAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
        await DevDataSeeder.SeedAsync(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>());
    }
}
