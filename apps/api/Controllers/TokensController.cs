using Api.Application.Users;
using Api.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Route("api/[controller]")]
public class TokensController(AuthService auth) : ApiControllerBase
{
    /// <summary>Authenticates with e-mail and password and issues a JWT.</summary>
    /// <response code="201">Token issued.</response>
    /// <response code="400">Invalid payload.</response>
    /// <response code="401">Invalid credentials.</response>
    [HttpPost]
    [ProducesResponseType<TokenResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create(CreateTokenRequest request, CancellationToken cancellationToken)
    {
        var result = await auth.AuthenticateAsync(request.Email, request.Password, cancellationToken);

        return ToActionResult(result, token =>
        {
            MarkNoStore();
            return Created(
                string.Empty,
                new TokenResponse(token.Token, "Bearer", token.ExpiresInSeconds,
                [
                    new Link("user", "/api/users/me", "GET"),
                ]));
        });
    }
}
