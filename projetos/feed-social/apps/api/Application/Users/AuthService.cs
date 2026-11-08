using Api.Application.Abstractions;
using Api.Application.Common;
using Api.Application.Models;
using Api.Domain;
using Microsoft.AspNetCore.Identity;

namespace Api.Application.Users;

public sealed class AuthService(IUserStore users, IPasswordHasher<User> hasher, ITokenService tokens)
{
    private static readonly User Dummy = new() { Name = "dummy", Email = "dummy@invalid", Username = "dummy" };

    private static readonly string DummyHash = new PasswordHasher<User>().HashPassword(Dummy, Guid.NewGuid().ToString());

    public async Task<Result<AccessToken>> AuthenticateAsync(
        string email, string password, CancellationToken cancellationToken = default)
    {
        var user = await users.FindByEmailAsync(email, cancellationToken);
        var verification = hasher.VerifyHashedPassword(user ?? Dummy, user?.PasswordHash ?? DummyHash, password);

        if (user is null || verification == PasswordVerificationResult.Failed)
        {
            return Errors.InvalidCredentials;
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            await users.UpdatePasswordHashAsync(user.Id, hasher.HashPassword(user, password), cancellationToken);
        }

        var (token, expiresIn) = tokens.CreateToken(user);
        return new AccessToken(token, expiresIn);
    }
}
