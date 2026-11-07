using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Api.Dtos;
using Api.Models;
using Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController(IUserStore users, IPasswordHasher<User> hasher) : ControllerBase
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
    public IActionResult Create(CreateUserRequest request)
    {
        var user = new User
        {
            Name = request.Name.Trim(),
            Email = request.Email.Trim(),
        };
        user.PasswordHash = hasher.HashPassword(user, request.Password);

        if (!users.TryAdd(user))
        {
            return Problem(
                title: "E-mail already registered",
                detail: "A user with this e-mail already exists.",
                statusCode: StatusCodes.Status409Conflict);
        }

        Response.Headers.CacheControl = "no-store";
        return CreatedAtRoute(MeRoute, null, ToResponse(user));
    }

    /// <summary>Returns the authenticated user.</summary>
    /// <response code="200">Authenticated user.</response>
    /// <response code="401">Missing, invalid or expired token.</response>
    [HttpGet("me", Name = MeRoute)]
    [Authorize]
    [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public IActionResult GetCurrent()
    {
        var sub = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (!Guid.TryParse(sub, out var id) || users.FindById(id) is not { } user)
        {
            return Problem(title: "Unauthorized", statusCode: StatusCodes.Status401Unauthorized);
        }

        Response.Headers.CacheControl = "no-store";
        return Ok(ToResponse(user));
    }

    private static UserResponse ToResponse(User user) =>
        new(user.Id, user.Name, user.Email,
        [
            new Link("self", "/api/users/me", "GET"),
            new Link("token", "/api/tokens", "POST"),
        ]);
}
