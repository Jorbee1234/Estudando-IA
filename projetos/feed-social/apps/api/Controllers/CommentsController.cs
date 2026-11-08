using Api.Application.Comments;
using Api.Dtos;
using Api.Mapping;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Route("api/posts/{postId:guid}/comments")]
public class CommentsController(CommentService comments) : ApiControllerBase
{
    /// <summary>Lists a post's comments, newest first, with cursor pagination.</summary>
    /// <response code="200">A page of comments.</response>
    /// <response code="400">Invalid cursor.</response>
    /// <response code="404">Post not found.</response>
    [HttpGet]
    [ProducesResponseType<PagedResponse<CommentResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> List(Guid postId, [FromQuery] PageQuery query, CancellationToken cancellationToken)
    {
        var result = await comments.ListAsync(postId, query.Cursor, query.Limit, cancellationToken);

        return ToActionResult(result, page =>
        {
            List<Link> links = [new("self", $"/api/posts/{postId}/comments{Request.QueryString}", "GET")];
            if (page.NextCursor is not null)
            {
                links.Add(new Link(
                    "next", $"/api/posts/{postId}/comments?limit={query.Limit}&cursor={page.NextCursor}", "GET"));
            }

            Response.Headers.CacheControl = "private, no-cache";
            return Ok(page.ToResponse(postId, links));
        });
    }

    /// <summary>Comments on a post as the authenticated user.</summary>
    /// <response code="201">Comment created.</response>
    /// <response code="400">Invalid payload.</response>
    /// <response code="401">Missing, invalid or expired token.</response>
    /// <response code="404">Post not found.</response>
    [HttpPost]
    [Authorize]
    [ProducesResponseType<CommentResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Create(Guid postId, CreateCommentRequest request, CancellationToken cancellationToken)
    {
        var result = await comments.AddAsync(CurrentUserId, postId, request.Body, cancellationToken);

        return ToActionResult(result, comment =>
        {
            MarkNoStore();
            return Created($"/api/posts/{postId}/comments/{comment.Id}", comment.ToResponse(postId));
        });
    }
}
