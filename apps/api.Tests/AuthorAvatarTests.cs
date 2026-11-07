using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Api.Tests.Support;
using Xunit;

namespace Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class AuthorAvatarTests(ApiFactory factory) : ApiTestBase(factory)
{
    private static Task<HttpResponseMessage> UploadAvatar(HttpClient client, byte[]? bytes = null)
    {
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes ?? TestImages.Png);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        content.Add(file, "file", "foto.png");
        return client.PutAsync("/api/profiles/me/avatar", content);
    }

    private static string? AvatarOf(JsonElement element) =>
        element.GetProperty("author").GetProperty("avatarUrl") is { ValueKind: JsonValueKind.String } url
            ? url.GetString()
            : null;

    [Fact]
    public async Task Author_without_a_picture_has_a_null_avatar_url_in_posts_and_comments()
    {
        var user = await NewUserAsync();
        var post = await CreatePostAsync(user.Client);
        var postId = post.GetProperty("id").GetGuid();
        await user.Client.PostAsJsonAsync($"/api/posts/{postId}/comments", new { body = "oi" });

        var listed = await Json(await Anonymous().GetAsync($"/api/posts?authorId={user.Id}"));
        var comments = await Json(await Anonymous().GetAsync($"/api/posts/{postId}/comments"));

        Assert.Null(AvatarOf(post));
        Assert.Null(AvatarOf(listed.GetProperty("items")[0]));
        Assert.Null(AvatarOf(comments.GetProperty("items")[0]));
    }

    [Fact]
    public async Task Uploaded_picture_shows_up_for_the_author_everywhere()
    {
        var user = await NewUserAsync();
        var postId = (await CreatePostAsync(user.Client)).GetProperty("id").GetGuid();
        await user.Client.PostAsJsonAsync($"/api/posts/{postId}/comments", new { body = "oi" });
        await UploadAvatar(user.Client);

        var listed = await Json(await Anonymous().GetAsync($"/api/posts?authorId={user.Id}"));
        var single = await Json(await Anonymous().GetAsync($"/api/posts/{postId}"));
        var comments = await Json(await Anonymous().GetAsync($"/api/posts/{postId}/comments"));
        var profile = await Json(await Anonymous().GetAsync($"/api/profiles/{user.Id}"));

        var expected = profile.GetProperty("avatarUrl").GetString();
        Assert.StartsWith($"/api/profiles/{user.Id}/avatar?v=", expected);
        Assert.Equal(expected, AvatarOf(listed.GetProperty("items")[0]));
        Assert.Equal(expected, AvatarOf(single));
        Assert.Equal(expected, AvatarOf(comments.GetProperty("items")[0]));
    }

    [Fact]
    public async Task A_comment_created_after_the_upload_already_carries_the_avatar()
    {
        var author = await NewUserAsync();
        var commenter = await NewUserAsync();
        var postId = (await CreatePostAsync(author.Client)).GetProperty("id").GetGuid();
        await UploadAvatar(commenter.Client);

        var response = await commenter.Client.PostAsJsonAsync($"/api/posts/{postId}/comments", new { body = "oi" });

        Assert.StartsWith($"/api/profiles/{commenter.Id}/avatar?v=", AvatarOf(await Json(response)));
    }

    [Fact]
    public async Task The_author_url_is_the_one_that_serves_the_image()
    {
        var user = await NewUserAsync();
        await CreatePostAsync(user.Client);
        await UploadAvatar(user.Client);
        var listed = await Json(await Anonymous().GetAsync($"/api/posts?authorId={user.Id}"));

        var download = await Anonymous().GetAsync(AvatarOf(listed.GetProperty("items")[0]));

        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal(TestImages.Png, await download.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Changing_the_picture_changes_the_url_and_removing_it_clears_it()
    {
        var user = await NewUserAsync();
        await CreatePostAsync(user.Client);
        await UploadAvatar(user.Client);
        var before = AvatarOf((await Json(await Anonymous().GetAsync($"/api/posts?authorId={user.Id}"))).GetProperty("items")[0]);

        await UploadAvatar(user.Client, TestImages.Jpeg);
        var after = AvatarOf((await Json(await Anonymous().GetAsync($"/api/posts?authorId={user.Id}"))).GetProperty("items")[0]);
        await user.Client.DeleteAsync("/api/profiles/me/avatar");
        var removed = AvatarOf((await Json(await Anonymous().GetAsync($"/api/posts?authorId={user.Id}"))).GetProperty("items")[0]);

        Assert.NotEqual(before, after);
        Assert.Null(removed);
    }

    [Fact]
    public async Task Only_the_author_with_a_picture_gets_an_avatar_in_a_mixed_feed()
    {
        var withPhoto = await NewUserAsync();
        var without = await NewUserAsync();
        var tag = UniqueTag();
        await CreatePostAsync(withPhoto.Client, tags: [tag]);
        await CreatePostAsync(without.Client, tags: [tag]);
        await UploadAvatar(withPhoto.Client);

        var items = (await Json(await Anonymous().GetAsync($"/api/posts?tags={tag}")))
            .GetProperty("items").EnumerateArray().ToList();

        Assert.Equal(2, items.Count);
        Assert.NotNull(AvatarOf(items.Single(i => i.GetProperty("author").GetProperty("id").GetGuid() == withPhoto.Id)));
        Assert.Null(AvatarOf(items.Single(i => i.GetProperty("author").GetProperty("id").GetGuid() == without.Id)));
    }
}
