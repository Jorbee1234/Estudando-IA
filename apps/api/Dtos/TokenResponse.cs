namespace Api.Dtos;

/// <summary>Issued access token.</summary>
/// <param name="AccessToken">JWT to send as <c>Authorization: Bearer</c>.</param>
/// <param name="TokenType">Always <c>Bearer</c>.</param>
/// <param name="ExpiresIn">Lifetime in seconds.</param>
/// <param name="Links">Related resources.</param>
public sealed record TokenResponse(string AccessToken, string TokenType, int ExpiresIn, IReadOnlyList<Link> Links);
