using Api.Application.Abstractions;
using Api.Application.Common;
using Api.Domain;
using Microsoft.AspNetCore.Identity;

namespace Api.Application.Users;

public sealed class UserService(IUserStore users, IPasswordHasher<User> hasher)
{
    private const int MaxUsernameAttempts = 40;

    public async Task<Result<User>> RegisterAsync(
        string name, string email, string password, CancellationToken cancellationToken = default)
    {
        var id = Guid.NewGuid();
        var trimmedName = name.Trim();
        var baseUsername = Username.FromName(trimmedName);
        string? passwordHash = null;

        for (var attempt = 1; attempt <= MaxUsernameAttempts; attempt++)
        {
            var candidate = Username.WithSuffix(baseUsername, attempt);
            if (Username.IsReserved(candidate))
            {
                continue;
            }

            var user = new User
            {
                Id = id,
                Name = trimmedName,
                Email = email.Trim(),
                NormalizedEmail = User.NormalizeEmail(email),
                Username = candidate,
            };
            passwordHash ??= hasher.HashPassword(user, password);
            user.PasswordHash = passwordHash;

            switch (await users.TryAddAsync(user, cancellationToken))
            {
                case AddUserResult.Added:
                    return user;
                case AddUserResult.EmailTaken:
                    return Errors.EmailTaken;
            }
        }

        throw new InvalidOperationException("Could not find a free username for the new user.");
    }

    public async Task<Result<User>> GetAsync(Guid? userId, CancellationToken cancellationToken = default) =>
        userId is { } id && await users.FindByIdAsync(id, cancellationToken) is { } user
            ? user
            : Errors.Unauthenticated;
}
