using Api.Application.Models;
using Api.Application.Posts;
using Api.Dtos;
using Api.Mapping;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Route("api/[controller]")]
public class PostsController(PostService posts) : ApiControllerBase
{
    private const string GetPostRoute = "GetPost";

    /// <summary>Lists posts with optional search, tag filter, sorting and cursor pagination.</summary>
    /// <remarks>
    /// Anonymous callers can read the feed. When a valid token is sent, <c>likedByMe</c> and the
    /// interaction links are filled in for the caller.
    /// </remarks>
    /// <response code="200">A page of posts.</response>
    /// <response code="400">Invalid filter, sort or cursor.</response>
    [HttpGet]
    [ProducesResponseType<PagedResponse<PostResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> List([FromQuery] ListPostsQuery query, CancellationToken cancellationToken)
    {
        var filter = new PostFilter(query.Q, query.Tags, query.Sort, query.Cursor, query.Limit, query.AuthorId);
        var result = await posts.ListAsync(filter, CurrentUserId, cancellationToken);

        return ToActionResult(result, page =>
        {
            List<Link> links = [new("self", $"/api/posts{Request.QueryString}", "GET")];
            if (page.NextCursor is not null)
            {
                links.Add(new Link("next", NextHref(query, page.NextCursor), "GET"));
            }

            MarkPrivateCache();
            return Ok(page.ToResponse(CurrentUserId is not null, links));
        });
    }

    /// <summary>Returns one post.</summary>
    /// <response code="200">The post.</response>
    /// <response code="404">Post not found.</response>
    [HttpGet("{id:guid}", Name = GetPostRoute)]
    [ProducesResponseType<PostResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid id, CancellationToken cancellationToken)
    {
        var result = await posts.GetAsync(id, CurrentUserId, cancellationToken);

        return ToActionResult(result, post =>
        {
            MarkPrivateCache();
            return Ok(post.ToResponse(CurrentUserId is not null));
        });
    }

    /// <summary>Publishes a post as the authenticated user.</summary>
    /// <response code="201">Post created.</response>
    /// <response code="400">Invalid payload.</response>
    /// <response code="401">Missing, invalid or expired token.</response>
    [HttpPost]
    [Authorize]
    [ProducesResponseType<PostResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create(CreatePostRequest request, CancellationToken cancellationToken)
    {
        var result = await posts.CreateAsync(
            CurrentUserId,
            new NewPost(request.Title, request.Description, request.ThumbnailUrl, request.Tags),
            cancellationToken);

        return ToActionResult(result, post =>
        {
            MarkNoStore();
            return CreatedAtRoute(GetPostRoute, new { id = post.Id }, post.ToResponse(authenticated: true));
        });
    }

    /// <summary>Likes a post as the authenticated user. Idempotent.</summary>
    /// <response code="204">The post is liked by the caller.</response>
    /// <response code="401">Missing, invalid or expired token.</response>
    /// <response code="404">Post not found.</response>
    [HttpPut("{id:guid}/likes/me")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Like(Guid id, CancellationToken cancellationToken) =>
        ToActionResult(await posts.LikeAsync(CurrentUserId, id, cancellationToken), NoContent);

    /// <summary>Removes the authenticated user's like from a post. Idempotent.</summary>
    /// <response code="204">The post is not liked by the caller.</response>
    /// <response code="401">Missing, invalid or expired token.</response>
    /// <response code="404">Post not found.</response>
    [HttpDelete("{id:guid}/likes/me")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unlike(Guid id, CancellationToken cancellationToken) =>
        ToActionResult(await posts.UnlikeAsync(CurrentUserId, id, cancellationToken), NoContent);

    private static string NextHref(ListPostsQuery query, string cursor)
    {
        var parameters = new List<string>();
        if (!string.IsNullOrWhiteSpace(query.Q)) parameters.Add($"q={Uri.EscapeDataString(query.Q)}");
        parameters.AddRange(query.Tags.Select(t => $"tags={Uri.EscapeDataString(t)}"));
        if (query.AuthorId is { } authorId) parameters.Add($"authorId={authorId}");
        parameters.Add($"sort={query.Sort}");
        parameters.Add($"limit={query.Limit}");
        parameters.Add($"cursor={cursor}");
        return $"/api/posts?{string.Join('&', parameters)}";
    }
}
