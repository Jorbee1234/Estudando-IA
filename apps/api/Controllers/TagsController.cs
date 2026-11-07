using Api.Application.Tags;
using Api.Dtos;
using Api.Mapping;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Route("api/[controller]")]
public class TagsController(TagService tags) : ApiControllerBase
{
    /// <summary>Lists tags ordered by popularity, optionally filtered by name.</summary>
    /// <param name="q">Text the tag name must contain (case-insensitive).</param>
    /// <param name="cancellationToken">Request cancellation.</param>
    /// <response code="200">Up to 50 tags.</response>
    [HttpGet]
    [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
    [ProducesResponseType<IReadOnlyList<TagResponse>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] string? q, CancellationToken cancellationToken)
    {
        var result = await tags.ListAsync(q, cancellationToken);
        return Ok(result.Select(t => t.ToResponse()).ToList());
    }
}
