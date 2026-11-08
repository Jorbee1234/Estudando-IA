using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Api.Application.Common;
using Api.Application.Profiles;
using Api.Tests.Support;
using Xunit;

namespace Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class ProfileTests(ApiFactory factory) : ApiTestBase(factory)
{
    private static MultipartFormDataContent FilePart(byte[] bytes, string contentType = "image/png")
    {
        var content = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        content.Add(file, "file", "image");
        return content;
    }

    private static bool HasLink(JsonElement body, string rel) =>
        body.GetProperty("links").EnumerateArray().Any(l => l.GetProperty("rel").GetString() == rel);

    private static async Task<JsonElement> GetProfileAsync(HttpClient client, Guid id)
    {
        var response = await client.GetAsync($"/api/profiles/{id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await Json(response);
    }

    // ---- GET /api/profiles/{id}

    [Fact]
    public async Task Get_returns_an_empty_profile_for_a_user_who_never_edited_it()
    {
        var user = await NewUserAsync("Ana Paula");

        var response = await Anonymous().GetAsync($"/api/profiles/{user.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json(response);
        Assert.Equal(user.Id, body.GetProperty("id").GetGuid());
        Assert.Equal("Ana Paula", body.GetProperty("name").GetString());
        Assert.StartsWith("ana", body.GetProperty("handle").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("about").ValueKind);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("accentColor").ValueKind);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("avatarUrl").ValueKind);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("bannerUrl").ValueKind);
        Assert.Equal(0, body.GetProperty("postsCount").GetInt32());
        Assert.True(HasLink(body, "self"));
        Assert.True(HasLink(body, "posts"));
        Assert.False(HasLink(body, "update"));
    }

    [Fact]
    public async Task Get_is_public_and_shows_edit_links_only_to_the_owner()
    {
        var owner = await NewUserAsync();
        var other = await NewUserAsync();

        var asOwner = await GetProfileAsync(owner.Client, owner.Id);
        var asOther = await GetProfileAsync(other.Client, owner.Id);

        Assert.True(HasLink(asOwner, "update"));
        Assert.True(HasLink(asOwner, "upload-avatar"));
        Assert.True(HasLink(asOwner, "upload-banner"));
        Assert.False(HasLink(asOther, "update"));
        Assert.False(HasLink(asOther, "upload-avatar"));
    }

    [Fact]
    public async Task Get_returns_404_for_an_unknown_user() =>
        await AssertProblemAsync(
            await Anonymous().GetAsync($"/api/profiles/{Guid.NewGuid()}"),
            HttpStatusCode.NotFound, Messages.Codes.ProfileNotFound, Messages.ProfileNotFound);

    [Fact]
    public async Task Get_counts_only_the_posts_of_that_user()
    {
        var author = await NewUserAsync();
        var other = await NewUserAsync();
        await CreatePostAsync(author.Client);
        await CreatePostAsync(author.Client);
        await CreatePostAsync(other.Client);

        var body = await GetProfileAsync(Anonymous(), author.Id);

        Assert.Equal(2, body.GetProperty("postsCount").GetInt32());
    }

    // ---- PUT /api/profiles/me

    [Fact]
    public async Task Update_saves_about_and_color_normalized_and_returns_200()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PatchJsonAsync(
            "/api/profiles/me", new { about = "  Dev front-end  ", accentColor = "#7dd3fc" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("Dev front-end", body.GetProperty("about").GetString());
        Assert.Equal("#7DD3FC", body.GetProperty("accentColor").GetString());
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());

        var read = await GetProfileAsync(Anonymous(), user.Id);
        Assert.Equal("Dev front-end", read.GetProperty("about").GetString());
        Assert.Equal("#7DD3FC", read.GetProperty("accentColor").GetString());
    }

    [Fact]
    public async Task Update_with_a_blank_about_clears_only_the_about()
    {
        var user = await NewUserAsync();
        await user.Client.PatchJsonAsync("/api/profiles/me", new { about = "Texto", accentColor = "#81FE88" });

        var response = await user.Client.PatchJsonAsync("/api/profiles/me", new { about = "   " });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json(response);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("about").ValueKind);
        Assert.Equal("#81FE88", body.GetProperty("accentColor").GetString());
    }

    [Fact]
    public async Task Update_accepts_an_about_of_exactly_500_characters()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PatchJsonAsync("/api/profiles/me", new { about = new string('a', 500) });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Update_rejects_an_about_longer_than_500_characters()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PatchJsonAsync("/api/profiles/me", new { about = new string('a', 501) });

        var body = await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.AboutTooLong, Messages.AboutTooLong);
        Assert.Equal(Messages.AboutTooLong, FieldError(body, "About"));
    }

    [Theory]
    [InlineData("81FE88")]
    [InlineData("#12345")]
    [InlineData("verde")]
    public async Task Update_rejects_a_malformed_color(string color)
    {
        var user = await NewUserAsync();

        var response = await user.Client.PatchJsonAsync("/api/profiles/me", new { accentColor = color });

        var body = await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.InvalidAccentColor, Messages.InvalidAccentColor);
        Assert.Equal(Messages.InvalidAccentColor, FieldError(body, "AccentColor"));
    }

    [Theory]
    [InlineData("#000000")]
    [InlineData("#00090E")]
    [InlineData("#111111")]
    public async Task Update_rejects_a_color_with_too_little_contrast(string color)
    {
        var user = await NewUserAsync();

        var response = await user.Client.PatchJsonAsync("/api/profiles/me", new { accentColor = color });

        var body = await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.LowContrastAccentColor,
            Messages.LowContrastAccentColor);
        Assert.Equal(Messages.LowContrastAccentColor, FieldError(body, "AccentColor"));
    }

    [Fact]
    public async Task Update_requires_authentication() =>
        await AssertUnauthenticatedAsync(
            await Anonymous().PatchJsonAsync("/api/profiles/me", new { about = "x" }));

    [Fact]
    public async Task Update_only_changes_the_caller_profile()
    {
        var user = await NewUserAsync();
        var other = await NewUserAsync();

        await user.Client.PatchJsonAsync("/api/profiles/me", new { about = "Meu texto" });

        var read = await GetProfileAsync(Anonymous(), other.Id);
        Assert.Equal(JsonValueKind.Null, read.GetProperty("about").ValueKind);
    }

    // ---- PUT /api/profiles/me/{avatar|banner}

    [Theory]
    [InlineData("avatar")]
    [InlineData("banner")]
    public async Task Upload_stores_the_image_and_it_can_be_downloaded(string kind)
    {
        var user = await NewUserAsync();

        var upload = await user.Client.PutAsync($"/api/profiles/me/{kind}", FilePart(TestImages.Png));

        Assert.Equal(HttpStatusCode.NoContent, upload.StatusCode);

        var profile = await GetProfileAsync(Anonymous(), user.Id);
        var url = profile.GetProperty($"{kind}Url").GetString();
        Assert.StartsWith($"/api/profiles/{user.Id}/{kind}?v=", url);
        Assert.True(HasLink(profile, kind));

        var download = await Anonymous().GetAsync($"/api/profiles/{user.Id}/{kind}");
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
        Assert.Equal("image/png", download.Content.Headers.ContentType?.MediaType);
        Assert.Equal(TestImages.Png, await download.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Upload_detects_the_type_from_the_bytes_not_from_the_declared_content_type()
    {
        var user = await NewUserAsync();

        var upload = await user.Client.PutAsync("/api/profiles/me/avatar", FilePart(TestImages.Jpeg, "image/png"));

        Assert.Equal(HttpStatusCode.NoContent, upload.StatusCode);
        var download = await Anonymous().GetAsync($"/api/profiles/{user.Id}/avatar");
        Assert.Equal("image/jpeg", download.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Upload_replaces_the_previous_image()
    {
        var user = await NewUserAsync();
        await user.Client.PutAsync("/api/profiles/me/avatar", FilePart(TestImages.Png));

        await user.Client.PutAsync("/api/profiles/me/avatar", FilePart(TestImages.Webp));

        var download = await Anonymous().GetAsync($"/api/profiles/{user.Id}/avatar");
        Assert.Equal("image/webp", download.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Upload_keeps_the_about_text_and_color()
    {
        var user = await NewUserAsync();
        await user.Client.PatchJsonAsync("/api/profiles/me", new { about = "Texto", accentColor = "#81FE88" });

        await user.Client.PutAsync("/api/profiles/me/banner", FilePart(TestImages.Png));

        var profile = await GetProfileAsync(Anonymous(), user.Id);
        Assert.Equal("Texto", profile.GetProperty("about").GetString());
        Assert.Equal("#81FE88", profile.GetProperty("accentColor").GetString());
    }

    [Fact]
    public async Task Update_keeps_the_uploaded_images()
    {
        var user = await NewUserAsync();
        await user.Client.PutAsync("/api/profiles/me/avatar", FilePart(TestImages.Png));

        await user.Client.PatchJsonAsync("/api/profiles/me", new { about = "Novo texto" });

        var download = await Anonymous().GetAsync($"/api/profiles/{user.Id}/avatar");
        Assert.Equal(HttpStatusCode.OK, download.StatusCode);
    }

    [Theory]
    [InlineData("avatar")]
    [InlineData("banner")]
    public async Task Upload_requires_authentication(string kind) =>
        await AssertUnauthenticatedAsync(
            await Anonymous().PutAsync($"/api/profiles/me/{kind}", FilePart(TestImages.Png)));

    [Theory]
    [InlineData("avatar")]
    [InlineData("banner")]
    public async Task Upload_rejects_files_that_are_not_png_jpeg_or_webp(string kind)
    {
        var user = await NewUserAsync();

        var response = await user.Client.PutAsync(
            $"/api/profiles/me/{kind}", FilePart("GIF89a-not-allowed"u8.ToArray(), "image/gif"));

        var body = await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.InvalidImageType, Messages.InvalidImageType);
        Assert.Equal(Messages.InvalidImageType, FieldError(body, ProfileService.ImageField));
    }

    [Fact]
    public async Task Upload_rejects_a_text_file_that_claims_to_be_an_image()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PutAsync(
            "/api/profiles/me/avatar", FilePart("<script>alert(1)</script>"u8.ToArray(), "image/png"));

        await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.InvalidImageType, Messages.InvalidImageType);
    }

    [Theory]
    [InlineData("avatar")]
    [InlineData("banner")]
    public async Task Upload_rejects_a_request_without_a_file(string kind)
    {
        var user = await NewUserAsync();

        var form = new MultipartFormDataContent { { new StringContent("x"), "other" } };

        var response = await user.Client.PutAsync($"/api/profiles/me/{kind}", form);

        var body = await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.ImageMissing, Messages.ImageMissing);
        Assert.Equal(Messages.ImageMissing, FieldError(body, ProfileService.ImageField));
    }

    [Fact]
    public async Task Upload_rejects_a_form_with_no_parts_at_all()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PutAsync("/api/profiles/me/avatar", new MultipartFormDataContent());

        await AssertValidationFailedAsync(response);
    }

    [Fact]
    public async Task Upload_rejects_a_json_body()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PutAsJsonAsync("/api/profiles/me/avatar", new { file = "x" });

        Assert.Equal(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
    }

    [Fact]
    public async Task Upload_rejects_an_empty_file()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PutAsync("/api/profiles/me/avatar", FilePart([]));

        await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.ImageMissing, Messages.ImageMissing);
    }

    [Fact]
    public async Task Upload_accepts_an_avatar_of_exactly_the_limit()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PutAsync(
            "/api/profiles/me/avatar", FilePart(TestImages.PngOfSize(ProfileService.AvatarMaxBytes)));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Upload_rejects_an_avatar_over_2_MB()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PutAsync(
            "/api/profiles/me/avatar", FilePart(TestImages.PngOfSize(ProfileService.AvatarMaxBytes + 1)));

        var body = await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.ImageTooLarge, Messages.AvatarTooLarge);
        Assert.Equal(Messages.AvatarTooLarge, FieldError(body, ProfileService.ImageField));
    }

    [Fact]
    public async Task Upload_accepts_a_banner_between_2_and_4_MB()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PutAsync(
            "/api/profiles/me/banner", FilePart(TestImages.PngOfSize(ProfileService.AvatarMaxBytes + 1)));

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Upload_rejects_a_banner_over_4_MB()
    {
        var user = await NewUserAsync();

        var response = await user.Client.PutAsync(
            "/api/profiles/me/banner", FilePart(TestImages.PngOfSize(ProfileService.BannerMaxBytes + 1)));

        await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.ImageTooLarge, Messages.BannerTooLarge);
    }

    [Theory]
    [InlineData("username")]
    [InlineData("foo")]
    public async Task Image_routes_only_exist_for_avatar_and_banner(string kind)
    {
        var user = await NewUserAsync();

        var upload = await user.Client.PutAsync($"/api/profiles/me/{kind}", FilePart(TestImages.Png));
        var remove = await user.Client.DeleteAsync($"/api/profiles/me/{kind}");
        var download = await Anonymous().GetAsync($"/api/profiles/{user.Id}/{kind}");

        Assert.Equal(HttpStatusCode.NotFound, upload.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, remove.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, download.StatusCode);
        var profile = await GetProfileAsync(Anonymous(), user.Id);
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("avatarUrl").ValueKind);
    }

    // ---- DELETE /api/profiles/me/{avatar|banner}

    [Theory]
    [InlineData("avatar")]
    [InlineData("banner")]
    public async Task Remove_deletes_the_image_and_is_idempotent(string kind)
    {
        var user = await NewUserAsync();
        await user.Client.PutAsync($"/api/profiles/me/{kind}", FilePart(TestImages.Png));

        var first = await user.Client.DeleteAsync($"/api/profiles/me/{kind}");
        var second = await user.Client.DeleteAsync($"/api/profiles/me/{kind}");

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        var profile = await GetProfileAsync(Anonymous(), user.Id);
        Assert.Equal(JsonValueKind.Null, profile.GetProperty($"{kind}Url").ValueKind);
        await AssertProblemAsync(
            await Anonymous().GetAsync($"/api/profiles/{user.Id}/{kind}"),
            HttpStatusCode.NotFound, Messages.Codes.ImageNotFound, Messages.ImageNotFound);
    }

    [Fact]
    public async Task Remove_for_a_user_without_a_profile_is_still_204()
    {
        var user = await NewUserAsync();

        var response = await user.Client.DeleteAsync("/api/profiles/me/avatar");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Remove_keeps_the_other_image()
    {
        var user = await NewUserAsync();
        await user.Client.PutAsync("/api/profiles/me/avatar", FilePart(TestImages.Png));
        await user.Client.PutAsync("/api/profiles/me/banner", FilePart(TestImages.Jpeg));

        await user.Client.DeleteAsync("/api/profiles/me/avatar");

        var banner = await Anonymous().GetAsync($"/api/profiles/{user.Id}/banner");
        Assert.Equal(HttpStatusCode.OK, banner.StatusCode);
    }

    [Theory]
    [InlineData("avatar")]
    [InlineData("banner")]
    public async Task Remove_requires_authentication(string kind) =>
        await AssertUnauthenticatedAsync(await Anonymous().DeleteAsync($"/api/profiles/me/{kind}"));

    // ---- GET /api/profiles/{id}/{avatar|banner}

    [Theory]
    [InlineData("avatar")]
    [InlineData("banner")]
    public async Task Download_returns_404_when_the_user_has_no_image(string kind)
    {
        var user = await NewUserAsync();

        var response = await Anonymous().GetAsync($"/api/profiles/{user.Id}/{kind}");

        await AssertProblemAsync(
            response, HttpStatusCode.NotFound, Messages.Codes.ImageNotFound, Messages.ImageNotFound);
    }

    [Fact]
    public async Task Download_returns_404_for_an_unknown_user() =>
        await AssertProblemAsync(
            await Anonymous().GetAsync($"/api/profiles/{Guid.NewGuid()}/avatar"),
            HttpStatusCode.NotFound, Messages.Codes.ImageNotFound, Messages.ImageNotFound);

    [Fact]
    public async Task Download_sends_an_etag_and_answers_304_when_it_matches()
    {
        var user = await NewUserAsync();
        await user.Client.PutAsync("/api/profiles/me/avatar", FilePart(TestImages.Png));
        var client = Anonymous();

        var first = await client.GetAsync($"/api/profiles/{user.Id}/avatar");
        var etag = first.Headers.ETag;

        Assert.NotNull(etag);
        Assert.Contains("public", first.Headers.CacheControl?.ToString());

        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/profiles/{user.Id}/avatar");
        request.Headers.IfNoneMatch.Add(etag);
        var second = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.NotModified, second.StatusCode);
        Assert.Empty(await second.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Download_etag_changes_after_a_new_upload()
    {
        var user = await NewUserAsync();
        await user.Client.PutAsync("/api/profiles/me/avatar", FilePart(TestImages.Png));
        var before = (await Anonymous().GetAsync($"/api/profiles/{user.Id}/avatar")).Headers.ETag;

        await user.Client.PutAsync("/api/profiles/me/avatar", FilePart(TestImages.Jpeg));

        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/profiles/{user.Id}/avatar");
        request.Headers.IfNoneMatch.Add(before!);
        var after = await Anonymous().SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, after.StatusCode);
    }

    [Fact]
    public async Task Profile_url_version_changes_when_the_profile_is_edited()
    {
        var user = await NewUserAsync();
        await user.Client.PutAsync("/api/profiles/me/avatar", FilePart(TestImages.Png));
        var before = (await GetProfileAsync(Anonymous(), user.Id)).GetProperty("avatarUrl").GetString();

        await user.Client.PutAsync("/api/profiles/me/avatar", FilePart(TestImages.Jpeg));

        var after = (await GetProfileAsync(Anonymous(), user.Id)).GetProperty("avatarUrl").GetString();
        Assert.NotEqual(before, after);
    }

    // ---- GET /api/posts?authorId=

    [Fact]
    public async Task Posts_can_be_filtered_by_author()
    {
        var author = await NewUserAsync();
        var other = await NewUserAsync();
        var mine = await CreatePostAsync(author.Client);
        await CreatePostAsync(other.Client);

        var response = await Anonymous().GetAsync($"/api/posts?authorId={author.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var items = (await Json(response)).GetProperty("items").EnumerateArray().ToList();
        var single = Assert.Single(items);
        Assert.Equal(mine.GetProperty("id").GetGuid(), single.GetProperty("id").GetGuid());
        Assert.Equal(author.Id, single.GetProperty("author").GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task Author_filter_returns_an_empty_page_for_a_user_without_posts()
    {
        var user = await NewUserAsync();

        var response = await Anonymous().GetAsync($"/api/posts?authorId={user.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty((await Json(response)).GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task Author_filter_is_kept_in_the_next_page_link()
    {
        var author = await NewUserAsync();
        for (var i = 0; i < 3; i++)
        {
            await CreatePostAsync(author.Client);
        }

        var response = await Anonymous().GetAsync($"/api/posts?authorId={author.Id}&limit=2");

        var body = await Json(response);
        Assert.Equal(2, body.GetProperty("items").GetArrayLength());
        var next = body.GetProperty("links").EnumerateArray()
            .Single(l => l.GetProperty("rel").GetString() == "next").GetProperty("href").GetString();
        Assert.Contains($"authorId={author.Id}", next);

        var second = await Json(await Anonymous().GetAsync(next!));
        Assert.Equal(1, second.GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task Author_filter_rejects_a_malformed_id() =>
        await AssertValidationFailedAsync(await Anonymous().GetAsync("/api/posts?authorId=nao-e-guid"));
}
