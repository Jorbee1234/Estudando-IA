using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Api.Application.Common;
using Api.Tests.Support;
using Xunit;

namespace Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class ErrorHandlingTests(ApiFactory factory) : ApiTestBase(factory)
{
    [Fact]
    public async Task Unknown_route_returns_404_with_the_default_title()
    {
        var response = await Anonymous().GetAsync("/api/does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await Json(response);
        Assert.Equal(Messages.Titles.NotFound, body.GetProperty("title").GetString());
    }

    [Fact]
    public async Task Malformed_json_returns_400_with_the_validation_message()
    {
        var content = new StringContent("{ not json", new MediaTypeHeaderValue("application/json"));

        var response = await Anonymous().PostAsync("/api/tokens", content);

        await AssertValidationFailedAsync(response);
    }

    [Fact]
    public async Task Forbidden_returns_403_with_the_standard_message()
    {
        var user = await NewUserAsync();

        var response = await user.Client.GetAsync("/api/__test/forbidden");

        await AssertProblemAsync(response, HttpStatusCode.Forbidden, Messages.Codes.Forbidden, Messages.Forbidden);
    }

    [Fact]
    public async Task Unhandled_exception_returns_500_without_leaking_details()
    {
        var response = await Anonymous().GetAsync("/api/__test/boom");

        var body = await AssertProblemAsync(
            response, HttpStatusCode.InternalServerError, Messages.Codes.ServerError, Messages.ServerError);
        Assert.DoesNotContain(FailureTestController.Secret, body.ToString());
        Assert.DoesNotContain("InvalidOperationException", body.ToString());
        Assert.False(body.TryGetProperty("stackTrace", out _));
    }

    [Fact]
    public async Task Expired_or_forged_token_returns_the_unauthenticated_problem()
    {
        var client = Anonymous();
        client.DefaultRequestHeaders.Authorization = new("Bearer", "eyJhbGciOiJIUzI1NiJ9.e30.invalida");

        var response = await client.PostAsJsonAsync("/api/posts", new { title = "Titulo", description = "d" });

        await AssertUnauthenticatedAsync(response);
    }
}
