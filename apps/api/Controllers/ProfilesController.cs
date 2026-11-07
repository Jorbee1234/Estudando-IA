using Api.Application.Common;
using Api.Application.Models;
using Api.Application.Profiles;
using Api.Dtos;
using Api.Mapping;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Route("api/[controller]")]
public class ProfilesController(ProfileService profiles) : ApiControllerBase
{
    private const string ImageKinds = "regex(^(avatar|banner)$)";
    private const int RequestOverhead = 64 * 1024;

    /// <summary>Returns a user's public profile.</summary>
    /// <response code="200">The profile.</response>
    /// <response code="404">User not found.</response>
    [HttpGet("{userId:guid}")]
    [ProducesResponseType<ProfileResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(Guid userId, CancellationToken cancellationToken)
    {
        var result = await profiles.GetAsync(userId, cancellationToken);

        return ToActionResult(result, profile =>
        {
            MarkPrivateCache();
            return Ok(profile.ToResponse(CurrentUserId == profile.Id));
        });
    }

    /// <summary>Partially updates the authenticated user's profile: name, @username, about text and accent color.</summary>
    /// <remarks>
    /// An omitted or <c>null</c> field is kept. An empty string clears <c>about</c> and <c>accentColor</c>.
    /// The name can be changed at any time; the @username once every 30 days (the first change is free).
    /// Everything is applied together or nothing is: a refused username leaves the other fields untouched.
    /// </remarks>
    /// <response code="200">The updated profile (also when nothing changed).</response>
    /// <response code="400">Invalid name, username, text or color; <c>errors</c> lists every offending field.</response>
    /// <response code="401">Missing, invalid or expired token.</response>
    /// <response code="409">Username already in use, or changed less than 30 days ago.</response>
    [HttpPatch("me")]
    [Authorize]
    [ProducesResponseType<ProfileResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var result = await profiles.UpdateAsync(
            CurrentUserId,
            new ProfileChanges(request.Name, request.Username, request.About, request.AccentColor),
            cancellationToken);

        return ToActionResult(result, profile =>
        {
            MarkNoStore();
            return Ok(profile.ToResponse(isOwner: true));
        });
    }

    /// <summary>Uploads the authenticated user's profile picture (<c>avatar</c>) or banner (<c>banner</c>).</summary>
    /// <remarks>Multipart form with a <c>file</c> part. PNG, JPEG or WebP; up to 2 MB (avatar) or 4 MB (banner).</remarks>
    /// <response code="204">Image saved.</response>
    /// <response code="400">Missing file, unsupported type or file too large.</response>
    /// <response code="401">Missing, invalid or expired token.</response>
    [HttpPut($"me/{{kind:{ImageKinds}}}")]
    [Authorize]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(ProfileService.BannerMaxBytes + RequestOverhead)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> UploadImage(
        string kind, IFormFile? file, CancellationToken cancellationToken)
    {
        var imageKind = ParseKind(kind);
        var data = await ReadAsync(file, ProfileService.MaxBytes(imageKind) + 1, cancellationToken);

        return ToActionResult(await profiles.SetImageAsync(CurrentUserId, imageKind, data, cancellationToken), () =>
        {
            MarkNoStore();
            return NoContent();
        });
    }

    /// <summary>Removes the authenticated user's profile picture or banner. Idempotent.</summary>
    /// <response code="204">The user has no such image.</response>
    /// <response code="401">Missing, invalid or expired token.</response>
    [HttpDelete($"me/{{kind:{ImageKinds}}}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RemoveImage(string kind, CancellationToken cancellationToken) =>
        ToActionResult(
            await profiles.RemoveImageAsync(CurrentUserId, ParseKind(kind), cancellationToken), NoContent);

    /// <summary>Returns a user's profile picture or banner.</summary>
    /// <response code="200">The image bytes.</response>
    /// <response code="304">Not modified (matches <c>If-None-Match</c>).</response>
    /// <response code="404">The user has no such image.</response>
    [HttpGet($"{{userId:guid}}/{{kind:{ImageKinds}}}")]
    [Produces("image/png", "image/jpeg", "image/webp")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status304NotModified)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetImage(Guid userId, string kind, CancellationToken cancellationToken)
    {
        var result = await profiles.GetImageAsync(userId, ParseKind(kind), cancellationToken);

        return ToActionResult(result, image =>
        {
            var etag = $"\"{image.UpdatedAt.Ticks:x}\"";
            Response.Headers.CacheControl = "public, no-cache";
            Response.Headers.ETag = etag;

            return Request.Headers.IfNoneMatch.Contains(etag)
                ? StatusCode(StatusCodes.Status304NotModified)
                : File(image.Data, image.ContentType);
        });
    }

    private static ProfileImageKind ParseKind(string kind) =>
        kind == "banner" ? ProfileImageKind.Banner : ProfileImageKind.Avatar;

    private static async Task<byte[]> ReadAsync(IFormFile? file, int limit, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return [];
        }

        var buffer = new byte[(int)Math.Min(file.Length, limit)];
        await using var stream = file.OpenReadStream();
        await stream.ReadExactlyAsync(buffer, cancellationToken);
        return buffer;
    }
}
