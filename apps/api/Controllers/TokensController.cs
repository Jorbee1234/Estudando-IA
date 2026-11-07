using Api.Dtos;
using Api.Models;
using Api.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TokensController(
    IUserStore users,
    IPasswordHasher<User> hasher,
    ITokenService tokens) : ControllerBase
{
    // Hash of a throwaway password, verified when the e-mail is unknown so both
    // failure paths take similar time and return the same response.
    private static readonly User Dummy = new()
    {
        Name = "dummy",
        Email = "dummy@invalid",
    };

    private static readonly string DummyHash = new PasswordHasher<User>().HashPassword(Dummy, Guid.NewGuid().ToString());

    /// <summary>Authenticates with e-mail and password and issues a JWT.</summary>
    /// <response code="201">Token issued.</response>
    /// <response code="400">Invalid payload.</response>
    /// <response code="401">Invalid credentials.</response>
    [HttpPost]
    [ProducesResponseType<TokenResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public IActionResult Create(CreateTokenRequest request)
    {
        var user = users.FindByEmail(request.Email);
        var result = hasher.VerifyHashedPassword(user ?? Dummy, user?.PasswordHash ?? DummyHash, request.Password);

        if (user is null || result == PasswordVerificationResult.Failed)
        {
            return Problem(
                title: "Invalid credentials",
                detail: "E-mail or password is incorrect.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        var (token, expiresIn) = tokens.CreateToken(user);

        Response.Headers.CacheControl = "no-store";
        return Created(
            string.Empty,
            new TokenResponse(token, "Bearer", expiresIn,
            [
                new Link("user", "/api/users/me", "GET"),
            ]));
    }
}
