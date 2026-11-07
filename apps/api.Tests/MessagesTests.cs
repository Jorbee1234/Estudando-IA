using Api.Application.Common;
using Xunit;

namespace Api.Tests;

public sealed class MessagesTests
{
    [Fact]
    public void Error_codes_are_unique_and_follow_the_area_dot_name_convention()
    {
        Assert.Equal(Messages.Codes.All.Count, Messages.Codes.All.Distinct().Count());
        Assert.All(Messages.Codes.All, code => Assert.Matches(@"^[a-z]+\.[a-z_]+$", code));
    }

    [Fact]
    public void Every_declared_code_constant_is_listed()
    {
        var declared = typeof(Messages.Codes)
            .GetFields()
            .Where(f => f.IsLiteral)
            .Select(f => (string)f.GetRawConstantValue()!);

        Assert.Equivalent(declared, Messages.Codes.All);
    }

    [Theory]
    [InlineData(400, Messages.Titles.BadRequest)]
    [InlineData(401, Messages.Titles.Unauthorized)]
    [InlineData(403, Messages.Titles.Forbidden)]
    [InlineData(404, Messages.Titles.NotFound)]
    [InlineData(409, Messages.Titles.Conflict)]
    [InlineData(422, Messages.Titles.Unprocessable)]
    [InlineData(500, Messages.Titles.ServerError)]
    [InlineData(503, Messages.Titles.ServerError)]
    public void Each_status_has_its_default_title(int status, string title) =>
        Assert.Equal(title, Messages.Titles.For(status));

    [Fact]
    public void Predefined_errors_use_registered_codes_and_non_empty_messages()
    {
        AppError[] errors =
        [
            Errors.Unauthenticated, Errors.InvalidCredentials, Errors.EmailTaken, Errors.PostNotFound,
            Errors.InvalidCursor, Errors.InvalidThumbnail("f"), Errors.TagTooLong("f"), Errors.CommentEmpty("f"),
            Errors.ProfileNotFound, Errors.ImageNotFound, Errors.AboutTooLong("f"), Errors.InvalidAccentColor("f"),
            Errors.LowContrastAccentColor("f"), Errors.InvalidImageType("f"),
            Errors.ImageTooLarge("f", Messages.AvatarTooLarge), Errors.ImageMissing("f"),
            Errors.InvalidName("f"), Errors.InvalidUsername("f"), Errors.UsernameTaken("f"), Errors.UsernameChangeTooSoon(DateTime.UtcNow),
        ];

        Assert.All(errors, error =>
        {
            Assert.Contains(error.Code, Messages.Codes.All);
            Assert.False(string.IsNullOrWhiteSpace(error.Message));
        });
    }

    [Fact]
    public void Blank_comment_error_carries_the_field_message()
    {
        var error = Errors.CommentEmpty("Body");

        Assert.Equal(ErrorKind.Validation, error.Kind);
        Assert.Equal(Messages.CommentEmpty, error.Fields!["Body"][0]);
    }
}
