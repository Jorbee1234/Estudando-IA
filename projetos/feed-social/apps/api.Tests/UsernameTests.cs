using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Api.Application.Common;
using Api.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Api.Tests;

[Collection(ApiCollection.Name)]
public sealed class UsernameTests(ApiFactory factory) : ApiTestBase(factory)
{
    private static string UniqueName() => $"u{Guid.NewGuid():N}"[..16];

    private static Task<HttpResponseMessage> Change(HttpClient client, string? username) =>
        client.PatchJsonAsync("/api/profiles/me", new { username });

    private async Task<JsonElement> ProfileOf(Guid id) =>
        await Json(await Anonymous().GetAsync($"/api/profiles/{id}"));


    private Task SetChangedAt(Guid id, DateTime? changedAt) =>
        Factory.ExecuteAsync(db => db.Users.Where(u => u.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.UsernameChangedAt, changedAt)));

    // ---- registration

    [Fact]
    public async Task Register_derives_the_username_from_the_first_name_and_numbers_duplicates()
    {
        var first = UniqueName();
        var anonymous = Anonymous();

        async Task<Guid> Register(string name)
        {
            var response = await anonymous.PostAsJsonAsync(
                "/api/users", new { name, email = $"{Guid.NewGuid():N}@example.com", password = Password });
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            return (await Json(response)).GetProperty("id").GetGuid();
        }

        var a = await Register($"{first} Silva");
        var b = await Register($"{first} Lima");
        var c = await Register($"{first.ToUpperInvariant()} Souza");

        Assert.Equal(first, (await ProfileOf(a)).GetProperty("handle").GetString());
        Assert.Equal($"{first}_2", (await ProfileOf(b)).GetProperty("handle").GetString());
        Assert.Equal($"{first}_3", (await ProfileOf(c)).GetProperty("handle").GetString());
    }

    [Fact]
    public async Task Registration_keeps_working_when_many_people_share_the_same_first_name()
    {
        var name = UniqueName();
        var anonymous = Anonymous();
        var handles = new List<string>();

        for (var i = 0; i < 12; i++)
        {
            var response = await anonymous.PostAsJsonAsync(
                "/api/users", new { name, email = $"{Guid.NewGuid():N}@example.com", password = Password });
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var id = (await Json(response)).GetProperty("id").GetGuid();
            handles.Add((await ProfileOf(id)).GetProperty("handle").GetString()!);
        }

        Assert.Equal(12, handles.Distinct().Count());
        Assert.Equal([name, $"{name}_2", $"{name}_3", $"{name}_4", $"{name}_5"], handles.Take(5));
    }

    [Fact]
    public async Task Register_never_hands_out_a_reserved_username()
    {
        var response = await Anonymous().PostAsJsonAsync(
            "/api/users", new { name = "Admin Silva", email = $"{Guid.NewGuid():N}@example.com", password = Password });

        var id = (await Json(response)).GetProperty("id").GetGuid();
        Assert.Equal("admin_2", (await ProfileOf(id)).GetProperty("handle").GetString());
    }

    [Fact]
    public async Task Concurrent_registrations_with_the_same_name_all_get_a_distinct_username()
    {
        var name = UniqueName();

        var responses = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ =>
            Anonymous().PostAsJsonAsync(
                "/api/users", new { name, email = $"{Guid.NewGuid():N}@example.com", password = Password })));

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.Created, r.StatusCode));
        var ids = await Task.WhenAll(responses.Select(async r => (await Json(r)).GetProperty("id").GetGuid()));
        var handles = await Task.WhenAll(ids.Select(async id => (await ProfileOf(id)).GetProperty("handle").GetString()));
        Assert.Equal(6, handles.Distinct().Count());
    }

    // ---- profile exposes the interval

    [Fact]
    public async Task New_profile_can_change_the_username_right_away()
    {
        var user = await NewUserAsync();

        var owner = await Json(await user.Client.GetAsync($"/api/profiles/{user.Id}"));

        Assert.Equal(JsonValueKind.Null, owner.GetProperty("usernameChangeAvailableAt").ValueKind);
    }

    // ---- PATCH /api/profiles/me (username)

    [Fact]
    public async Task Change_saves_the_trimmed_lower_case_username_and_returns_the_profile()
    {
        var user = await NewUserAsync();
        var wanted = UniqueName();

        var response = await Change(user.Client, $"  {wanted.ToUpperInvariant()} ");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("no-store", response.Headers.CacheControl?.ToString());
        var body = await Json(response);
        Assert.Equal(wanted, body.GetProperty("handle").GetString());
        Assert.Equal(user.Id, body.GetProperty("id").GetGuid());
        Assert.NotEqual(JsonValueKind.Null, body.GetProperty("usernameChangeAvailableAt").ValueKind);
        Assert.Equal(wanted, (await ProfileOf(user.Id)).GetProperty("handle").GetString());
    }

    [Fact]
    public async Task Change_is_reflected_in_the_posts_of_the_user()
    {
        var user = await NewUserAsync();
        await CreatePostAsync(user.Client);
        var wanted = UniqueName();

        await Change(user.Client, wanted);

        var page = await Json(await Anonymous().GetAsync($"/api/posts?authorId={user.Id}"));
        Assert.Equal(wanted, page.GetProperty("items")[0].GetProperty("author").GetProperty("handle").GetString());
    }

    [Fact]
    public async Task Change_to_the_same_username_is_idempotent_and_keeps_the_interval()
    {
        var user = await NewUserAsync();
        var wanted = UniqueName();
        var first = await Json(await Change(user.Client, wanted));

        var again = await Change(user.Client, wanted.ToUpperInvariant());

        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal(
            first.GetProperty("usernameChangeAvailableAt").GetDateTime(),
            (await Json(again)).GetProperty("usernameChangeAvailableAt").GetDateTime());
    }

    [Fact]
    public async Task Change_to_the_current_generated_username_does_not_start_the_interval()
    {
        var user = await NewUserAsync();
        var current = (await ProfileOf(user.Id)).GetProperty("handle").GetString();

        var response = await Change(user.Client, current);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Null, (await Json(response)).GetProperty("usernameChangeAvailableAt").ValueKind);
        Assert.Equal(HttpStatusCode.OK, (await Change(user.Client, UniqueName())).StatusCode);
    }

    [Fact]
    public async Task Second_change_inside_30_days_returns_409_with_the_date()
    {
        var user = await NewUserAsync();
        var first = await Json(await Change(user.Client, UniqueName()));
        var availableAt = first.GetProperty("usernameChangeAvailableAt").GetDateTime();

        var response = await Change(user.Client, UniqueName());

        await AssertProblemAsync(
            response, HttpStatusCode.Conflict, Messages.Codes.UsernameChangeTooSoon,
            Messages.UsernameChangeTooSoon(availableAt));
        Assert.InRange(availableAt, DateTime.UtcNow.AddDays(29), DateTime.UtcNow.AddDays(31));
    }

    [Fact]
    public async Task Change_is_blocked_at_29_days_and_allowed_at_30()
    {
        var user = await NewUserAsync();
        await Change(user.Client, UniqueName());

        await SetChangedAt(user.Id, DateTime.UtcNow.AddDays(-29));
        Assert.Equal(HttpStatusCode.Conflict, (await Change(user.Client, UniqueName())).StatusCode);

        await SetChangedAt(user.Id, DateTime.UtcNow.AddDays(-30).AddMinutes(-1));
        var allowed = await Change(user.Client, UniqueName());

        Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
    }

    [Fact]
    public async Task Profile_shows_the_unlock_date_to_everyone_and_the_link_returns_when_it_passes()
    {
        var user = await NewUserAsync();
        await Change(user.Client, UniqueName());

        var locked = await ProfileOf(user.Id);
        Assert.NotEqual(JsonValueKind.Null, locked.GetProperty("usernameChangeAvailableAt").ValueKind);

        await SetChangedAt(user.Id, DateTime.UtcNow.AddDays(-31));
        var owner = await Json(await user.Client.GetAsync($"/api/profiles/{user.Id}"));
        Assert.Equal(JsonValueKind.Null, owner.GetProperty("usernameChangeAvailableAt").ValueKind);
    }

    [Fact]
    public async Task Change_to_a_username_in_use_returns_409_ignoring_case_and_keeps_the_interval_free()
    {
        var user = await NewUserAsync();
        var other = await NewUserAsync();
        var taken = UniqueName();
        await Change(other.Client, taken);

        var response = await Change(user.Client, taken.ToUpperInvariant());

        var body = await AssertProblemAsync(
            response, HttpStatusCode.Conflict, Messages.Codes.UsernameTaken, Messages.UsernameTaken);
        Assert.Equal(Messages.UsernameTaken, FieldError(body, "Username"));
        Assert.Equal(HttpStatusCode.OK, (await Change(user.Client, UniqueName())).StatusCode);
    }

    [Theory]
    [InlineData("ab")]
    [InlineData("has space")]
    [InlineData("com-hifen")]
    [InlineData("acentuação")]
    [InlineData("me")]
    [InlineData("ADMIN")]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Change_rejects_an_invalid_or_reserved_username(string? username)
    {
        var user = await NewUserAsync();

        var response = await Change(user.Client, username);

        var body = await AssertProblemAsync(
            response, HttpStatusCode.BadRequest, Messages.Codes.InvalidUsername, Messages.InvalidUsername);
        Assert.Equal(Messages.InvalidUsername, FieldError(body, "Username"));
    }

    [Fact]
    public async Task Change_rejects_a_username_longer_than_30_characters_and_accepts_exactly_30()
    {
        var user = await NewUserAsync();

        await AssertProblemAsync(
            await Change(user.Client, new string('a', 31)),
            HttpStatusCode.BadRequest, Messages.Codes.InvalidUsername, Messages.InvalidUsername);
        Assert.Equal(HttpStatusCode.OK, (await Change(user.Client, $"b{Guid.NewGuid():N}"[..30])).StatusCode);
    }

    [Fact]
    public async Task Invalid_change_does_not_start_the_interval()
    {
        var user = await NewUserAsync();

        await Change(user.Client, "x");

        Assert.Equal(HttpStatusCode.OK, (await Change(user.Client, UniqueName())).StatusCode);
    }

    [Fact]
    public async Task Change_requires_authentication() =>
        await AssertUnauthenticatedAsync(await Change(Anonymous(), UniqueName()));

    [Fact]
    public async Task Change_cannot_touch_another_user()
    {
        var user = await NewUserAsync();
        var other = await NewUserAsync();
        var before = (await ProfileOf(other.Id)).GetProperty("handle").GetString();

        await Change(user.Client, UniqueName());

        Assert.Equal(before, (await ProfileOf(other.Id)).GetProperty("handle").GetString());
    }

    [Fact]
    public async Task Simultaneous_changes_let_only_one_through()
    {
        var user = await NewUserAsync();
        var requests = Enumerable.Range(0, 5)
            .Select(_ => Change(user.Client, UniqueName()))
            .ToArray();

        var responses = await Task.WhenAll(requests);

        Assert.Equal(1, responses.Count(r => r.StatusCode == HttpStatusCode.OK));
        Assert.Equal(4, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        var rejected = responses.First(r => r.StatusCode == HttpStatusCode.Conflict);
        Assert.Equal(Messages.Codes.UsernameChangeTooSoon, (await Json(rejected)).GetProperty("code").GetString());
    }

    [Fact]
    public async Task Old_tokens_keep_working_after_the_change()
    {
        var user = await NewUserAsync();

        await Change(user.Client, UniqueName());

        Assert.Equal(HttpStatusCode.OK, (await user.Client.GetAsync("/api/users/me")).StatusCode);
    }
}
