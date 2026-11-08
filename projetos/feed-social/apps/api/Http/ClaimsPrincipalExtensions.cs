using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Api.Http;

public static class ClaimsPrincipalExtensions
{
    /// <summary>Reads the user id from the <c>sub</c> claim (inbound claim mapping is off). Null when anonymous.</summary>
    public static Guid? GetUserId(this ClaimsPrincipal principal) =>
        Guid.TryParse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub), out var id) ? id : null;
}
