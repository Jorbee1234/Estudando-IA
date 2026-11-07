using Api.Domain;

namespace Api.Application.Abstractions;

public interface ITokenService
{
    /// <summary>Creates a signed JWT for the user and returns it with its lifetime in seconds.</summary>
    (string Token, int ExpiresInSeconds) CreateToken(User user);
}
