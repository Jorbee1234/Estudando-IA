using System.Net;
using System.Net.Http.Json;
using Api.Application.Common;
using Api.Tests.Support;
using Xunit;

namespace Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class UsersAndAuthTests(ApiFactory factory) : ApiTestBase(factory)
{
    [Fact]
    public async Task Register_returns_201_with_links_and_no_store()
    {
        var email = $"u{Guid.NewGuid():N}@example.com";

        var response = await Anonymous().PostAsJsonAsync("/api/users", new { name = "Ana", email, password = Password });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("/api/users/me", response.Headers.Location?.AbsolutePath);
        Assert.Contains("no-store", response.Headers.CacheControl?.ToString());
        var body = await Json(response);
        Assert.Equal(email, body.GetProperty("email").GetString());
        Assert.Contains(body.GetProperty("links").EnumerateArray(), l => l.GetProperty("rel").GetString() == "self");
        Assert.False(body.TryGetProperty("passwordHash", out _));
    }

    [Fact]
    public async Task Register_duplicate_email_returns_409_ignoring_case()
    {
        var user = await NewUserAsync();

        var response = await Anonymous().PostAsJsonAsync(
            "/api/users", new { name = "Outra", email = user.Email.ToUpperInvariant(), password = Password });

        await AssertProblemAsync(
            response,
            HttpStatusCode.Conflict,
            Messages.Codes.EmailTaken,
            Messages.EmailTaken);
    }

    [Fact]
    public async Task Register_invalid_payload_returns_400_with_field_errors()
    {
        var response = await Anonymous().PostAsJsonAsync("/api/users", new { name = "A", email = "nope", password = "123" });

        var body = await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.ValidationFailed, Messages.ValidationFailed);
        var errors = body.GetProperty("errors");
        Assert.True(errors.TryGetProperty("Name", out _));
        Assert.True(errors.TryGetProperty("Email", out _));
        Assert.True(errors.TryGetProperty("Password", out _));
    }

    [Fact]
    public async Task Login_returns_201_with_bearer_token()
    {
        var user = await NewUserAsync();

        var response = await Anonymous().PostAsJsonAsync("/api/tokens", new { email = user.Email, password = Password });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Json(response);
        Assert.False(string.IsNullOrEmpty(body.GetProperty("accessToken").GetString()));
        Assert.Equal("Bearer", body.GetProperty("tokenType").GetString());
        Assert.True(body.GetProperty("expiresIn").GetInt32() > 0);
    }

    [Fact]
    public async Task Login_with_wrong_password_returns_401()
    {
        var user = await NewUserAsync();

        var response = await Anonymous().PostAsJsonAsync("/api/tokens", new { email = user.Email, password = "errada-123" });

        await AssertProblemAsync(
            response,
            HttpStatusCode.Unauthorized,
            Messages.Codes.InvalidCredentials,
            Messages.InvalidCredentials);
    }

    [Fact]
    public async Task Login_with_unknown_email_returns_the_same_401()
    {
        var response = await Anonymous().PostAsJsonAsync(
            "/api/tokens", new { email = $"x{Guid.NewGuid():N}@example.com", password = Password });

        await AssertProblemAsync(
            response,
            HttpStatusCode.Unauthorized,
            Messages.Codes.InvalidCredentials,
            Messages.InvalidCredentials);
    }

    [Fact]
    public async Task Login_invalid_payload_returns_400()
    {
        var response = await Anonymous().PostAsJsonAsync("/api/tokens", new { email = "nope", password = "" });

        await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.ValidationFailed, Messages.ValidationFailed);
    }

    [Fact]
    public async Task Me_returns_the_authenticated_user()
    {
        var user = await NewUserAsync("Julio Costa");

        var response = await user.Client.GetAsync("/api/users/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json(response);
        Assert.Equal(user.Id, body.GetProperty("id").GetGuid());
        Assert.Equal("Julio Costa", body.GetProperty("name").GetString());
    }

    [Fact]
    public async Task Me_without_token_returns_401()
    {
        var response = await Anonymous().GetAsync("/api/users/me");

        await AssertProblemAsync(
            response, HttpStatusCode.Unauthorized, Messages.Codes.Unauthenticated, Messages.Unauthenticated);
    }

    [Fact]
    public async Task Me_with_garbage_token_returns_401()
    {
        var client = Anonymous();
        client.DefaultRequestHeaders.Authorization = new("Bearer", "not-a-jwt");

        var response = await client.GetAsync("/api/users/me");

        await AssertProblemAsync(
            response, HttpStatusCode.Unauthorized, Messages.Codes.Unauthenticated, Messages.Unauthenticated);
    }
}
