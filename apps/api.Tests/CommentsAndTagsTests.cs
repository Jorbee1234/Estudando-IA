using System.Net;
using System.Net.Http.Json;
using Api.Application.Common;
using Api.Tests.Support;
using Xunit;

namespace Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class CommentsAndTagsTests(ApiFactory factory) : ApiTestBase(factory)
{
    [Fact]
    public async Task Create_comment_returns_201_and_increments_the_counter()
    {
        var author = await NewUserAsync();
        var commenter = await NewUserAsync("Marcos Lima");
        var postId = (await CreatePostAsync(author.Client)).GetProperty("id").GetGuid();

        var response = await commenter.Client.PostAsJsonAsync($"/api/posts/{postId}/comments", new { body = "  Muito bom  " });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Contains("no-store", response.Headers.CacheControl?.ToString());
        var body = await Json(response);
        Assert.Equal("Muito bom", body.GetProperty("body").GetString());
        Assert.StartsWith("marcos", body.GetProperty("author").GetProperty("handle").GetString());
        Assert.Equal($"/api/posts/{postId}/comments/{body.GetProperty("id").GetGuid()}", response.Headers.Location?.OriginalString);
        var post = await Json(await Anonymous().GetAsync($"/api/posts/{postId}"));
        Assert.Equal(1, post.GetProperty("commentsCount").GetInt32());
    }

    [Fact]
    public async Task Create_comment_with_blank_body_returns_400_and_keeps_the_counter()
    {
        var user = await NewUserAsync();
        var postId = (await CreatePostAsync(user.Client)).GetProperty("id").GetGuid();

        var response = await user.Client.PostAsJsonAsync($"/api/posts/{postId}/comments", new { body = "   " });

        var body = await AssertValidationFailedAsync(response);
        Assert.True(body.GetProperty("errors").TryGetProperty("Body", out _));
        var post = await Json(await Anonymous().GetAsync($"/api/posts/{postId}"));
        Assert.Equal(0, post.GetProperty("commentsCount").GetInt32());
    }

    [Fact]
    public async Task Create_comment_on_unknown_post_returns_404()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PostAsJsonAsync($"/api/posts/{Guid.NewGuid()}/comments", new { body = "oi" });

        await AssertPostNotFoundAsync(response);
    }

    [Fact]
    public async Task Create_comment_without_token_returns_401()
    {
        var response = await Anonymous().PostAsJsonAsync($"/api/posts/{Guid.NewGuid()}/comments", new { body = "oi" });

        await AssertUnauthenticatedAsync(response);
    }

    [Fact]
    public async Task List_comments_paginates_newest_first_with_links()
    {
        var user = await NewUserAsync();
        var postId = (await CreatePostAsync(user.Client)).GetProperty("id").GetGuid();
        var ids = new List<Guid>();
        for (var i = 0; i < 3; i++)
        {
            var created = await Json(await user.Client.PostAsJsonAsync($"/api/posts/{postId}/comments", new { body = $"c{i}" }));
            ids.Add(created.GetProperty("id").GetGuid());
        }

        var first = await Json(await Anonymous().GetAsync($"/api/posts/{postId}/comments?limit=2"));
        var cursor = first.GetProperty("nextCursor").GetString();
        var second = await Json(await Anonymous().GetAsync($"/api/posts/{postId}/comments?limit=2&cursor={cursor}"));

        Assert.Equal(
            new[] { ids[2], ids[1] },
            first.GetProperty("items").EnumerateArray().Select(c => c.GetProperty("id").GetGuid()));
        Assert.Equal(
            new[] { ids[0] },
            second.GetProperty("items").EnumerateArray().Select(c => c.GetProperty("id").GetGuid()));
        Assert.Contains(first.GetProperty("links").EnumerateArray(), l => l.GetProperty("rel").GetString() == "next");
    }

    [Fact]
    public async Task List_comments_of_unknown_post_returns_404()
    {
        var response = await Anonymous().GetAsync($"/api/posts/{Guid.NewGuid()}/comments");

        await AssertPostNotFoundAsync(response);
    }

    [Fact]
    public async Task List_comments_rejects_an_invalid_cursor()
    {
        var user = await NewUserAsync();
        var postId = (await CreatePostAsync(user.Client)).GetProperty("id").GetGuid();

        var response = await Anonymous().GetAsync($"/api/posts/{postId}/comments?cursor=%25%25%25");

        await AssertInvalidCursorAsync(response);
    }

    [Fact]
    public async Task List_tags_filters_by_name_and_counts_posts()
    {
        var user = await NewUserAsync();
        var tag = UniqueTag();
        await CreatePostAsync(user.Client, tags: [tag]);

        var response = await Anonymous().GetAsync($"/api/tags?q={tag[..10].ToUpperInvariant()}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var tags = await Json(response);
        Assert.Equal(1, tags.GetArrayLength());
        Assert.Equal(tag, tags[0].GetProperty("name").GetString());
        Assert.Equal(1, tags[0].GetProperty("postsCount").GetInt32());
    }

    [Fact]
    public async Task Health_returns_ok()
    {
        var response = await Anonymous().GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
