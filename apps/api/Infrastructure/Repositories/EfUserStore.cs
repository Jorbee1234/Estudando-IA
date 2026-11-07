using Api.Application.Abstractions;
using Api.Domain;
using Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Api.Infrastructure.Repositories;

public sealed class EfUserStore(AppDbContext db) : IUserStore
{
    public async Task<AddUserResult> TryAddAsync(User user, CancellationToken cancellationToken = default)
    {
        db.Users.Add(user);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return AddUserResult.Added;
        }
        catch (DbUpdateException ex) when (UniqueViolation(ex) is { } violation)
        {
            db.Entry(user).State = EntityState.Detached;
            return IsUsernameIndex(violation) ? AddUserResult.UsernameTaken : AddUserResult.EmailTaken;
        }
    }

    public Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalized = User.NormalizeEmail(email);
        return db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.NormalizedEmail == normalized, cancellationToken);
    }

    public Task<User?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default) =>
        db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

    public async Task UpdatePasswordHashAsync(Guid id, string passwordHash, CancellationToken cancellationToken = default) =>
        await db.Users.Where(u => u.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.PasswordHash, passwordHash), cancellationToken);

    private static PostgresException? UniqueViolation(Exception ex) =>
        (ex as PostgresException ?? ex.InnerException as PostgresException) is { SqlState: PostgresErrorCodes.UniqueViolation } pg
            ? pg
            : null;

    private static bool IsUsernameIndex(PostgresException ex) =>
        ex.ConstraintName?.Contains("Username", StringComparison.OrdinalIgnoreCase) == true;
}
