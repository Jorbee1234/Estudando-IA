using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Api.Application.Common;
using Api.Domain;
using Api.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class ProfileUpdateTests(ApiFactory factory) : ApiTestBase(factory)
{
    private static string UniqueName() => $"u{Guid.NewGuid():N}"[..16];

    private static Task<HttpResponseMessage> Patch(HttpClient client, object body) =>
        client.PatchJsonAsync("/api/profiles/me", body);

    private async Task<JsonElement> ProfileOf(Guid id) =>
        await Json(await Anonymous().GetAsync($"/api/profiles/{id}"));

    // ---- name

    [Fact]
    public async Task Name_is_trimmed_saved_and_shown_in_the_profile()
    {
        var user = await NewUserAsync("Maria Silva");

        var response = await Patch(user.Client, new { name = "  Maria Oliveira  " });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Maria Oliveira", (await Json(response)).GetProperty("name").GetString());
        Assert.Equal("Maria Oliveira", (await ProfileOf(user.Id)).GetProperty("name").GetString());
    }

    [Fact]
    public async Task Name_can_be_changed_again_right_away_without_any_interval()
    {
        var user = await NewUserAsync();

        for (var i = 0; i < 4; i++)
        {
            var response = await Patch(user.Client, new { name = $"Nome Numero {i}" });
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        Assert.Equal("Nome Numero 3", (await ProfileOf(user.Id)).GetProperty("name").GetString());
    }

    [Fact]
    public async Task Name_does_not_change_the_username()
    {
        var user = await NewUserAsync("Maria Silva");
        var before = (await ProfileOf(user.Id)).GetProperty("handle").GetString();

        var after = await Json(await Patch(user.Client, new { name = "Joana Prado" }));

        Assert.Equal(before, after.GetProperty("handle").GetString());
        Assert.Equal(JsonValueKind.Null, after.GetProperty("usernameChangeAvailableAt").ValueKind);
    }

    [Fact]
    public async Task Name_change_shows_up_in_posts_and_comments()
    {
        var user = await NewUserAsync("Maria Silva");
        var postId = (await CreatePostAsync(user.Client)).GetProperty("id").GetGuid();
        await user.Client.PostAsJsonAsync($"/api/posts/{postId}/comments", new { body = "oi" });

        await Patch(user.Client, new { name = "Maria Nova" });

        var post = await Json(await Anonymous().GetAsync($"/api/posts/{postId}"));
        var comments = await Json(await Anonymous().GetAsync($"/api/posts/{postId}/comments"));
        Assert.Equal("Maria Nova", post.GetProperty("author").GetProperty("name").GetString());
        Assert.Equal("Maria Nova", comments.GetProperty("items")[0].GetProperty("author").GetProperty("name").GetString());
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("A")]
    public async Task Name_rejects_blank_or_too_short(string name)
    {
        var user = await NewUserAsync();

        var response = await Patch(user.Client, new { name });

        var body = await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.InvalidName, Messages.InvalidName);
        Assert.Equal(Messages.InvalidName, FieldError(body, "Name"));
    }

    [Fact]
    public async Task Name_accepts_2_and_100_characters_and_rejects_101()
    {
        var user = await NewUserAsync();

        Assert.Equal(HttpStatusCode.OK, (await Patch(user.Client, new { name = "Jo" })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await Patch(user.Client, new { name = new string('a', 100) })).StatusCode);
        await AssertProblemAsync(
            await Patch(user.Client, new { name = new string('a', 101) }),
            HttpStatusCode.BadRequest, Messages.Codes.InvalidName, Messages.InvalidName);
    }

    // ---- name does not touch credentials or tokens

    [Fact]
    public async Task Renaming_keeps_the_same_token_valid_and_the_login_working()
    {
        var user = await NewUserAsync("Maria Silva");

        await Patch(user.Client, new { name = "Outro Nome" });

        var me = await Json(await user.Client.GetAsync("/api/users/me"));
        Assert.Equal("Outro Nome", me.GetProperty("name").GetString());
        var login = await Anonymous().PostAsJsonAsync("/api/tokens", new { email = user.Email, password = Password });
        Assert.Equal(HttpStatusCode.Created, login.StatusCode);
    }

    // ---- partial semantics

    [Fact]
    public async Task Fields_that_are_omitted_or_null_are_kept()
    {
        var user = await NewUserAsync("Maria Silva");
        var username = UniqueName();
        await Patch(user.Client, new { username, about = "Texto", accentColor = "#7DD3FC" });

        var response = await Patch(user.Client, new { name = "Maria Nova", about = (string?)null, accentColor = (string?)null });

        var body = await Json(response);
        Assert.Equal("Maria Nova", body.GetProperty("name").GetString());
        Assert.Equal("Texto", body.GetProperty("about").GetString());
        Assert.Equal("#7DD3FC", body.GetProperty("accentColor").GetString());
        Assert.Equal(username, body.GetProperty("handle").GetString());
    }

    [Fact]
    public async Task An_empty_string_clears_the_about_and_the_color()
    {
        var user = await NewUserAsync();
        await Patch(user.Client, new { about = "Texto", accentColor = "#7DD3FC" });

        var body = await Json(await Patch(user.Client, new { about = "", accentColor = "" }));

        Assert.Equal(JsonValueKind.Null, body.GetProperty("about").ValueKind);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("accentColor").ValueKind);
    }

    [Fact]
    public async Task An_empty_body_changes_nothing_and_returns_200()
    {
        var user = await NewUserAsync("Maria Silva");
        await Patch(user.Client, new { about = "Texto" });

        var response = await Patch(user.Client, new { });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("Maria Silva", body.GetProperty("name").GetString());
        Assert.Equal("Texto", body.GetProperty("about").GetString());
    }

    [Fact]
    public async Task Changing_only_the_color_does_not_erase_the_about()
    {
        var user = await NewUserAsync();
        await Patch(user.Client, new { about = "Texto" });

        var body = await Json(await Patch(user.Client, new { accentColor = "#F9A8D4" }));

        Assert.Equal("Texto", body.GetProperty("about").GetString());
        Assert.Equal("#F9A8D4", body.GetProperty("accentColor").GetString());
    }

    [Fact]
    public async Task Everything_can_be_changed_in_one_request()
    {
        var user = await NewUserAsync("Maria Silva");
        var username = UniqueName();

        var response = await Patch(user.Client, new { name = "Maria Nova", username, about = "  Sobre mim  " });

        var body = await Json(response);
        Assert.Equal("Maria Nova", body.GetProperty("name").GetString());
        Assert.Equal(username, body.GetProperty("handle").GetString());
        Assert.Equal("Sobre mim", body.GetProperty("about").GetString());
    }

    // ---- validation reports every field

    [Fact]
    public async Task Every_invalid_field_is_reported_together_with_the_code_of_the_first()
    {
        var user = await NewUserAsync();

        var response = await Patch(user.Client, new { name = "A", username = "x", about = new string('a', 501), accentColor = "verde" });

        var body = await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.InvalidName, Messages.InvalidName);
        Assert.Equal(Messages.InvalidName, FieldError(body, "Name"));
        Assert.Equal(Messages.InvalidUsername, FieldError(body, "Username"));
        Assert.Equal(Messages.AboutTooLong, FieldError(body, "About"));
        Assert.Equal(Messages.InvalidAccentColor, FieldError(body, "AccentColor"));
    }

    [Fact]
    public async Task An_invalid_field_prevents_the_valid_ones_from_being_saved()
    {
        var user = await NewUserAsync("Maria Silva");

        await Patch(user.Client, new { name = "Maria Nova", about = new string('a', 501) });

        Assert.Equal("Maria Silva", (await ProfileOf(user.Id)).GetProperty("name").GetString());
    }

    // ---- all or nothing

    [Fact]
    public async Task A_username_in_use_rolls_back_the_name_and_the_about()
    {
        var user = await NewUserAsync("Maria Silva");
        var other = await NewUserAsync();
        var taken = UniqueName();
        await Patch(other.Client, new { username = taken });

        var response = await Patch(user.Client, new { name = "Maria Nova", about = "Novo texto", username = taken });

        await AssertProblemAsync(
            response, HttpStatusCode.Conflict, Messages.Codes.UsernameTaken, Messages.UsernameTaken);
        var profile = await ProfileOf(user.Id);
        Assert.Equal("Maria Silva", profile.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("about").ValueKind);
    }

    [Fact]
    public async Task A_username_inside_the_interval_leaves_the_other_fields_untouched()
    {
        var user = await NewUserAsync("Maria Silva");
        await Patch(user.Client, new { username = UniqueName() });

        var response = await Patch(user.Client, new { name = "Maria Nova", about = "Texto", username = UniqueName() });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(Messages.Codes.UsernameChangeTooSoon, (await Json(response)).GetProperty("code").GetString());
        var profile = await ProfileOf(user.Id);
        Assert.Equal("Maria Silva", profile.GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, profile.GetProperty("about").ValueKind);
    }

    [Fact]
    public async Task A_locked_username_does_not_stop_the_name_and_the_about_from_changing()
    {
        var user = await NewUserAsync("Maria Silva");
        var username = UniqueName();
        await Patch(user.Client, new { username });

        var response = await Patch(user.Client, new { name = "Maria Nova", about = "Texto", username });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Json(response);
        Assert.Equal("Maria Nova", body.GetProperty("name").GetString());
        Assert.Equal("Texto", body.GetProperty("about").GetString());
        Assert.Equal(username, body.GetProperty("handle").GetString());
    }

    [Fact]
    public async Task The_same_username_with_other_changes_does_not_start_the_interval()
    {
        var user = await NewUserAsync("Maria Silva");
        var current = (await ProfileOf(user.Id)).GetProperty("handle").GetString();

        var response = await Patch(user.Client, new { name = "Maria Nova", username = current });

        Assert.Equal(JsonValueKind.Null, (await Json(response)).GetProperty("usernameChangeAvailableAt").ValueKind);
        Assert.Equal(HttpStatusCode.OK, (await Patch(user.Client, new { username = UniqueName() })).StatusCode);
    }

    [Fact]
    public async Task The_username_can_be_changed_again_after_30_days_together_with_the_name()
    {
        var user = await NewUserAsync("Maria Silva");
        await Patch(user.Client, new { username = UniqueName() });
        await Factory.ExecuteAsync(db => db.Users.Where(u => u.Id == user.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.UsernameChangedAt, DateTime.UtcNow.AddDays(-31))));
        var wanted = UniqueName();

        var response = await Patch(user.Client, new { name = "Maria Nova", username = wanted });

        var body = await Json(response);
        Assert.Equal(wanted, body.GetProperty("handle").GetString());
        Assert.Equal("Maria Nova", body.GetProperty("name").GetString());
    }

    // ---- access

    [Fact]
    public async Task Update_requires_authentication() =>
        await AssertUnauthenticatedAsync(await Patch(Anonymous(), new { name = "Qualquer" }));

    [Fact]
    public async Task The_old_PUT_routes_are_gone()
    {
        var user = await NewUserAsync();

        var wanted = UniqueName();

        var put = await user.Client.PutAsJsonAsync("/api/profiles/me", new { about = "x", username = wanted });
        var putUsername = await user.Client.PutAsJsonAsync("/api/profiles/me/username", new { username = wanted });

        Assert.Equal(HttpStatusCode.MethodNotAllowed, put.StatusCode);
        Assert.False(putUsername.IsSuccessStatusCode);
        Assert.NotEqual(wanted, (await ProfileOf(user.Id)).GetProperty("handle").GetString());
    }

    [Fact]
    public async Task The_owner_gets_a_PATCH_update_link()
    {
        var user = await NewUserAsync();

        var owner = await Json(await user.Client.GetAsync($"/api/profiles/{user.Id}"));

        var update = owner.GetProperty("links").EnumerateArray().Single(l => l.GetProperty("rel").GetString() == "update");
        Assert.Equal("PATCH", update.GetProperty("method").GetString());
        Assert.Equal("/api/profiles/me", update.GetProperty("href").GetString());
    }

    [Fact]
    public async Task Simultaneous_updates_with_different_usernames_let_only_one_through_and_keep_the_data_consistent()
    {
        var user = await NewUserAsync("Maria Silva");
        var requests = Enumerable.Range(0, 5)
            .Select(i => Patch(user.Client, new { name = $"Nome Concorrente {i}", username = UniqueName() }))
            .ToArray();

        var responses = await Task.WhenAll(requests);

        Assert.Equal(1, responses.Count(r => r.StatusCode == HttpStatusCode.OK));
        Assert.Equal(4, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        var winner = await Json(responses.Single(r => r.StatusCode == HttpStatusCode.OK));
        var stored = await ProfileOf(user.Id);
        Assert.Equal(winner.GetProperty("name").GetString(), stored.GetProperty("name").GetString());
        Assert.Equal(winner.GetProperty("handle").GetString(), stored.GetProperty("handle").GetString());
    }
}
