using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Api.Application.Common;
using Api.Tests.Support;
using Xunit;

namespace Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class PostsTests(ApiFactory factory) : ApiTestBase(factory)
{
    [Fact]
    public async Task Create_returns_201_with_location_distinct_normalized_tags_and_author()
    {
        var user = await NewUserAsync("Ana Paula");
        var tag = UniqueTag();

        var response = await user.Client.PostAsJsonAsync("/api/posts", new
        {
            title = "  Meu post  ",
            description = "  Descrição  ",
            thumbnailUrl = "https://example.com/capa.png",
            tags = new[] { tag.ToUpperInvariant(), $" {tag} ", "css-" + tag },
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Json(response);
        var id = body.GetProperty("id").GetGuid();
        Assert.Equal($"/api/posts/{id}", response.Headers.Location?.AbsolutePath);
        Assert.Contains("no-store", response.Headers.CacheControl?.ToString());
        Assert.Equal("Meu post", body.GetProperty("title").GetString());
        Assert.Equal("Descrição", body.GetProperty("description").GetString());
        Assert.Equal(2, body.GetProperty("tags").GetArrayLength());
        Assert.Equal(0, body.GetProperty("likesCount").GetInt32());
        Assert.Equal(0, body.GetProperty("commentsCount").GetInt32());
        Assert.Equal(user.Id, body.GetProperty("author").GetProperty("id").GetGuid());
        Assert.StartsWith("ana", body.GetProperty("author").GetProperty("handle").GetString());
    }

    [Fact]
    public async Task Create_reuses_an_existing_tag()
    {
        var user = await NewUserAsync();
        var tag = UniqueTag();

        await CreatePostAsync(user.Client, tags: [tag]);
        await CreatePostAsync(user.Client, tags: [tag.ToUpperInvariant()]);

        var tags = await Json(await Anonymous().GetAsync($"/api/tags?q={tag}"));
        Assert.Equal(1, tags.GetArrayLength());
        Assert.Equal(2, tags[0].GetProperty("postsCount").GetInt32());
    }

    [Fact]
    public async Task Concurrent_posts_creating_the_same_new_tag_all_succeed()
    {
        var user = await NewUserAsync();
        var tag = UniqueTag();

        var responses = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ =>
            user.Client.PostAsJsonAsync("/api/posts", new
            {
                title = $"Post {Guid.NewGuid():N}",
                description = "Descrição",
                tags = new[] { tag },
            })));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.Created, r.StatusCode));
        var tags = await Json(await Anonymous().GetAsync($"/api/tags?q={tag}"));
        Assert.Equal(1, tags.GetArrayLength());
        Assert.Equal(8, tags[0].GetProperty("postsCount").GetInt32());
    }

    [Fact]
    public async Task Create_with_invalid_thumbnail_returns_400()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PostAsJsonAsync("/api/posts", new
        {
            title = "Titulo",
            description = "Descrição",
            thumbnailUrl = "ftp://example.com/x.png",
        });

        var body = await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.InvalidThumbnail, Messages.InvalidThumbnail);
        Assert.Equal(Messages.InvalidThumbnail, FieldError(body, "ThumbnailUrl"));
    }

    [Fact]
    public async Task Create_with_a_tag_over_30_characters_returns_400()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PostAsJsonAsync("/api/posts", new
        {
            title = "Titulo",
            description = "Descrição",
            tags = new[] { new string('a', 31) },
        });

        var body = await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.TagTooLong, Messages.TagTooLong);
        Assert.Equal(Messages.TagTooLong, FieldError(body, "Tags"));
    }

    [Fact]
    public async Task Create_with_missing_fields_returns_400_with_field_errors()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PostAsJsonAsync("/api/posts", new { title = "ab", description = "" });

        var body = await AssertValidationFailedAsync(response);
        Assert.True(body.GetProperty("errors").TryGetProperty("Title", out _));
        Assert.True(body.GetProperty("errors").TryGetProperty("Description", out _));
    }

    [Fact]
    public async Task Create_without_token_returns_401()
    {
        var response = await Anonymous().PostAsJsonAsync("/api/posts", new { title = "Titulo", description = "d" });

        await AssertUnauthenticatedAsync(response);
    }

    [Fact]
    public async Task Get_returns_the_post_for_anonymous_callers()
    {
        var user = await NewUserAsync();
        var post = await CreatePostAsync(user.Client);
        var id = post.GetProperty("id").GetGuid();

        var response = await Anonymous().GetAsync($"/api/posts/{id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("private", response.Headers.CacheControl?.ToString());
        var body = await Json(response);
        Assert.Equal(id, body.GetProperty("id").GetGuid());
        Assert.False(body.GetProperty("likedByMe").GetBoolean());
    }

    [Fact]
    public async Task Get_unknown_post_returns_404()
    {
        var response = await Anonymous().GetAsync($"/api/posts/{Guid.NewGuid()}");

        await AssertPostNotFoundAsync(response);
    }

    [Fact]
    public async Task List_filters_by_all_requested_tags()
    {
        var user = await NewUserAsync();
        var (a, b) = (UniqueTag(), UniqueTag());
        var both = await CreatePostAsync(user.Client, tags: [a, b]);
        await CreatePostAsync(user.Client, tags: [a]);

        var page = await Json(await Anonymous().GetAsync($"/api/posts?tags={a}&tags={b}"));

        Assert.Equal(1, page.GetProperty("items").GetArrayLength());
        Assert.Equal(
            both.GetProperty("id").GetGuid(),
            page.GetProperty("items")[0].GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task List_searches_title_and_description_case_insensitively_and_escapes_wildcards()
    {
        var user = await NewUserAsync();
        var token = UniqueTag();
        await CreatePostAsync(user.Client, title: $"Guia de {token.ToUpperInvariant()}");
        await CreatePostAsync(user.Client, title: "Outro", description: $"fala sobre {token}");

        var found = await Json(await Anonymous().GetAsync($"/api/posts?q={token}"));
        var wildcard = await Json(await Anonymous().GetAsync("/api/posts?q=%25"));

        Assert.Equal(2, found.GetProperty("items").GetArrayLength());
        Assert.Equal(0, wildcard.GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task List_paginates_with_cursor_newest_first()
    {
        var user = await NewUserAsync();
        var tag = UniqueTag();
        var ids = new List<Guid>();
        for (var i = 0; i < 3; i++)
        {
            ids.Add((await CreatePostAsync(user.Client, tags: [tag])).GetProperty("id").GetGuid());
        }

        var first = await Json(await Anonymous().GetAsync($"/api/posts?tags={tag}&limit=2"));
        var cursor = first.GetProperty("nextCursor").GetString();
        var second = await Json(await Anonymous().GetAsync($"/api/posts?tags={tag}&limit=2&cursor={cursor}"));

        Assert.Equal(
            new[] { ids[2], ids[1] },
            first.GetProperty("items").EnumerateArray().Select(p => p.GetProperty("id").GetGuid()));
        Assert.Contains(first.GetProperty("links").EnumerateArray(), l => l.GetProperty("rel").GetString() == "next");
        Assert.Equal(
            new[] { ids[0] },
            second.GetProperty("items").EnumerateArray().Select(p => p.GetProperty("id").GetGuid()));
        Assert.Equal(JsonValueKind.Null, second.GetProperty("nextCursor").ValueKind);
    }

    [Fact]
    public async Task List_popular_orders_by_likes_and_pages_with_its_own_cursor()
    {
        var author = await NewUserAsync();
        var fan = await NewUserAsync();
        var tag = UniqueTag();
        var quiet = (await CreatePostAsync(author.Client, tags: [tag])).GetProperty("id").GetGuid();
        var loved = (await CreatePostAsync(author.Client, tags: [tag])).GetProperty("id").GetGuid();
        await fan.Client.PutAsync($"/api/posts/{loved}/likes/me", null);

        var first = await Json(await Anonymous().GetAsync($"/api/posts?tags={tag}&sort=popular&limit=1"));
        var cursor = first.GetProperty("nextCursor").GetString();
        var second = await Json(await Anonymous().GetAsync($"/api/posts?tags={tag}&sort=popular&limit=1&cursor={cursor}"));

        Assert.Equal(loved, first.GetProperty("items")[0].GetProperty("id").GetGuid());
        Assert.Equal(quiet, second.GetProperty("items")[0].GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task List_rejects_a_cursor_issued_for_another_sort()
    {
        var user = await NewUserAsync();
        var tag = UniqueTag();
        await CreatePostAsync(user.Client, tags: [tag]);
        await CreatePostAsync(user.Client, tags: [tag]);
        var recent = await Json(await Anonymous().GetAsync($"/api/posts?tags={tag}&limit=1"));
        var cursor = recent.GetProperty("nextCursor").GetString();

        var response = await Anonymous().GetAsync($"/api/posts?tags={tag}&sort=popular&cursor={cursor}");

        await AssertInvalidCursorAsync(response);
    }

    [Fact]
    public async Task List_rejects_a_malformed_cursor()
    {
        var response = await Anonymous().GetAsync("/api/posts?cursor=%25%25%25");

        await AssertInvalidCursorAsync(response);
    }

    [Fact]
    public async Task List_rejects_an_unknown_sort_and_out_of_range_limit()
    {
        var sort = await Anonymous().GetAsync("/api/posts?sort=oldest");
        var limit = await Anonymous().GetAsync("/api/posts?limit=500");

        var sortBody = await AssertValidationFailedAsync(sort);
        await AssertValidationFailedAsync(limit);
        Assert.Equal(Messages.InvalidSort, FieldError(sortBody, "Sort"));
    }

    [Fact]
    public async Task Like_is_idempotent_and_updates_counter_and_liked_by_me()
    {
        var author = await NewUserAsync();
        var fan = await NewUserAsync();
        var id = (await CreatePostAsync(author.Client)).GetProperty("id").GetGuid();

        var first = await fan.Client.PutAsync($"/api/posts/{id}/likes/me", null);
        var second = await fan.Client.PutAsync($"/api/posts/{id}/likes/me", null);
        var asFan = await Json(await fan.Client.GetAsync($"/api/posts/{id}"));
        var asAnonymous = await Json(await Anonymous().GetAsync($"/api/posts/{id}"));

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        Assert.Equal(1, asFan.GetProperty("likesCount").GetInt32());
        Assert.True(asFan.GetProperty("likedByMe").GetBoolean());
        Assert.False(asAnonymous.GetProperty("likedByMe").GetBoolean());
    }

    [Fact]
    public async Task Unlike_is_idempotent_and_never_goes_below_zero()
    {
        var author = await NewUserAsync();
        var fan = await NewUserAsync();
        var id = (await CreatePostAsync(author.Client)).GetProperty("id").GetGuid();
        await fan.Client.PutAsync($"/api/posts/{id}/likes/me", null);

        var first = await fan.Client.DeleteAsync($"/api/posts/{id}/likes/me");
        var second = await fan.Client.DeleteAsync($"/api/posts/{id}/likes/me");
        var post = await Json(await fan.Client.GetAsync($"/api/posts/{id}"));

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        Assert.Equal(0, post.GetProperty("likesCount").GetInt32());
        Assert.False(post.GetProperty("likedByMe").GetBoolean());
    }

    [Fact]
    public async Task Likes_from_different_users_accumulate()
    {
        var author = await NewUserAsync();
        var (a, b) = (await NewUserAsync(), await NewUserAsync());
        var id = (await CreatePostAsync(author.Client)).GetProperty("id").GetGuid();

        await a.Client.PutAsync($"/api/posts/{id}/likes/me", null);
        await b.Client.PutAsync($"/api/posts/{id}/likes/me", null);

        var post = await Json(await Anonymous().GetAsync($"/api/posts/{id}"));
        Assert.Equal(2, post.GetProperty("likesCount").GetInt32());
    }

    [Fact]
    public async Task Like_and_unlike_unknown_post_return_404()
    {
        var user = await NewUserAsync();
        var id = Guid.NewGuid();

        var like = await user.Client.PutAsync($"/api/posts/{id}/likes/me", null);
        var unlike = await user.Client.DeleteAsync($"/api/posts/{id}/likes/me");

        await AssertPostNotFoundAsync(like);
        await AssertPostNotFoundAsync(unlike);
    }

    [Fact]
    public async Task Like_and_unlike_without_token_return_401()
    {
        var id = Guid.NewGuid();

        var like = await Anonymous().PutAsync($"/api/posts/{id}/likes/me", null);
        var unlike = await Anonymous().DeleteAsync($"/api/posts/{id}/likes/me");

        await AssertUnauthenticatedAsync(like);
        await AssertUnauthenticatedAsync(unlike);
    }
}
