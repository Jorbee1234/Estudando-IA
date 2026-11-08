using Api.Domain;

namespace Api.Application.Abstractions;

public enum AddUserResult
{
    Added,
    EmailTaken,
    UsernameTaken,
}

public interface IUserStore
{
    Task<AddUserResult> TryAddAsync(User user, CancellationToken cancellationToken = default);

    Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken = default);

    Task<User?> FindByIdAsync(Guid id, CancellationToken cancellationToken = default);

    Task UpdatePasswordHashAsync(Guid id, string passwordHash, CancellationToken cancellationToken = default);
}
