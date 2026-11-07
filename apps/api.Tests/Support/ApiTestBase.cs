using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Api.Application.Common;
using Xunit;

namespace Api.Tests.Support;

public sealed record TestUser(HttpClient Client, string Email, Guid Id, string Name);

public abstract class ApiTestBase(ApiFactory factory)
{
    public const string Password = "Senha@1234";

    protected ApiFactory Factory { get; } = factory;

    protected HttpClient Anonymous() => Factory.CreateClient();

    protected async Task<TestUser> NewUserAsync(string name = "Maria Silva")
    {
        var email = $"u{Guid.NewGuid():N}@example.com";
        var anonymous = Anonymous();

        var register = await anonymous.PostAsJsonAsync("/api/users", new { name, email, password = Password });
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);
        var user = await Json(register);

        var login = await anonymous.PostAsJsonAsync("/api/tokens", new { email, password = Password });
        Assert.Equal(HttpStatusCode.Created, login.StatusCode);
        var token = (await Json(login)).GetProperty("accessToken").GetString()!;

        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return new TestUser(client, email, user.GetProperty("id").GetGuid(), name);
    }

    protected static string UniqueTag() => $"t{Guid.NewGuid():N}"[..20];

    protected static async Task<JsonElement> Json(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    protected static async Task<JsonElement> CreatePostAsync(
        HttpClient client,
        string? title = null,
        string[]? tags = null,
        string? description = null)
    {
        var response = await client.PostAsJsonAsync("/api/posts", new
        {
            title = title ?? $"Post {Guid.NewGuid():N}",
            description = description ?? "Descrição do post",
            tags = tags ?? [],
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await Json(response);
    }

    protected static async Task<JsonElement> AssertProblemAsync(
        HttpResponseMessage response,
        HttpStatusCode status,
        string code,
        string detail)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);

        var body = await Json(response);
        Assert.Equal((int)status, body.GetProperty("status").GetInt32());
        Assert.Equal(Messages.Titles.For((int)status), body.GetProperty("title").GetString());
        Assert.Equal(detail, body.GetProperty("detail").GetString());
        Assert.Equal(code, body.GetProperty("code").GetString());

        return body;
    }

    protected static Task<JsonElement> AssertUnauthenticatedAsync(HttpResponseMessage response) =>
        AssertProblemAsync(
            response, HttpStatusCode.Unauthorized, Messages.Codes.Unauthenticated, Messages.Unauthenticated);

    protected static Task<JsonElement> AssertPostNotFoundAsync(HttpResponseMessage response) =>
        AssertProblemAsync(response, HttpStatusCode.NotFound, Messages.Codes.PostNotFound, Messages.PostNotFound);

    protected static Task<JsonElement> AssertInvalidCursorAsync(HttpResponseMessage response) =>
        AssertProblemAsync(response, HttpStatusCode.BadRequest, Messages.Codes.InvalidCursor, Messages.InvalidCursor);

    protected static Task<JsonElement> AssertValidationFailedAsync(HttpResponseMessage response) =>
        AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.ValidationFailed, Messages.ValidationFailed);

    protected static string FieldError(JsonElement problem, string field) =>
        problem.GetProperty("errors").GetProperty(field)[0].GetString()!;
}
