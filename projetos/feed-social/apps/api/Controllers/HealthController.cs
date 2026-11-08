using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Route("api/[controller]")]
public class HealthController : ApiControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok" });
}
