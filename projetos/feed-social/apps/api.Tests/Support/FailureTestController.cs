using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Tests.Support;

[ApiController]
[Route("api/__test")]
public sealed class FailureTestController : ControllerBase
{
    public const string Secret = "segredo-interno-do-servidor";

    [HttpGet("boom")]
    public IActionResult Boom() => throw new InvalidOperationException(Secret);

    [HttpGet("forbidden")]
    [Authorize(Roles = "admin")]
    public IActionResult Forbidden() => Ok();
}
