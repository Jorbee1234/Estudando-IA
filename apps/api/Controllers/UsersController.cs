using Api.Application.Users;
using Api.Dtos;
using Api.Mapping;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Route("api/[controller]")]
public class UsersController(UserService users) : ApiControllerBase
{
    private const string MeRoute = "GetCurrentUser";

    /// <summary>Registers a new user.</summary>
    /// <response code="201">User created.</response>
    /// <response code="400">Invalid payload.</response>
    /// <response code="409">E-mail already registered.</response>
    [HttpPost]
    [ProducesResponseType<UserResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(CreateUserRequest request, CancellationToken cancellationToken)
    {
        var result = await users.RegisterAsync(request.Name, request.Email, request.Password, cancellationToken);

        return ToActionResult(result, user =>
        {
            MarkNoStore();
            return CreatedAtRoute(MeRoute, null, user.ToResponse());
        });
    }

    /// <summary>Returns the authenticated user.</summary>
    /// <response code="200">Authenticated user.</response>
    /// <response code="401">Missing, invalid or expired token.</response>
    [HttpGet("me", Name = MeRoute)]
    [Authorize]
    [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrent(CancellationToken cancellationToken)
    {
        var result = await users.GetAsync(CurrentUserId, cancellationToken);

        return ToActionResult(result, user =>
        {
            MarkNoStore();
            return Ok(user.ToResponse());
        });
    }
}
