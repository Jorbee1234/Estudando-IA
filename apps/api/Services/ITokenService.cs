using Api.Models;

namespace Api.Services;

public interface ITokenService
{
    /// <summary>Creates a signed JWT for the user and returns it with its lifetime in seconds.</summary>
    (string Token, int ExpiresInSeconds) CreateToken(User user);
}
