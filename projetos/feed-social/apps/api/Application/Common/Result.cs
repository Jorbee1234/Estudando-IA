namespace Api.Application.Common;

public enum ErrorKind
{
    Validation,
    Unauthorized,
    NotFound,
    Conflict,
}

public sealed record AppError(
    ErrorKind Kind,
    string Code,
    string Message,
    IReadOnlyDictionary<string, string[]>? Fields = null);

public static class Errors
{
    public static readonly AppError Unauthenticated =
        new(ErrorKind.Unauthorized, Messages.Codes.Unauthenticated, Messages.Unauthenticated);

    public static readonly AppError InvalidCredentials =
        new(ErrorKind.Unauthorized, Messages.Codes.InvalidCredentials, Messages.InvalidCredentials);

    public static readonly AppError EmailTaken =
        new(ErrorKind.Conflict, Messages.Codes.EmailTaken, Messages.EmailTaken);

    public static readonly AppError PostNotFound =
        new(ErrorKind.NotFound, Messages.Codes.PostNotFound, Messages.PostNotFound);

    public static readonly AppError InvalidCursor =
        new(ErrorKind.Validation, Messages.Codes.InvalidCursor, Messages.InvalidCursor);

    public static AppError InvalidThumbnail(string field) =>
        Field(Messages.Codes.InvalidThumbnail, Messages.InvalidThumbnail, field);

    public static AppError TagTooLong(string field) =>
        Field(Messages.Codes.TagTooLong, Messages.TagTooLong, field);

    public static AppError CommentEmpty(string field) =>
        Field(Messages.Codes.CommentEmpty, Messages.CommentEmpty, field);

    public static readonly AppError ProfileNotFound =
        new(ErrorKind.NotFound, Messages.Codes.ProfileNotFound, Messages.ProfileNotFound);

    public static readonly AppError ImageNotFound =
        new(ErrorKind.NotFound, Messages.Codes.ImageNotFound, Messages.ImageNotFound);

    public static AppError InvalidName(string field) =>
        Field(Messages.Codes.InvalidName, Messages.InvalidName, field);

    public static AppError InvalidUsername(string field) =>
        Field(Messages.Codes.InvalidUsername, Messages.InvalidUsername, field);

    public static AppError UsernameTaken(string field) =>
        new(ErrorKind.Conflict, Messages.Codes.UsernameTaken, Messages.UsernameTaken,
            new Dictionary<string, string[]> { [field] = [Messages.UsernameTaken] });

    public static AppError UsernameChangeTooSoon(DateTime availableAt) =>
        new(ErrorKind.Conflict, Messages.Codes.UsernameChangeTooSoon, Messages.UsernameChangeTooSoon(availableAt));

    public static AppError AboutTooLong(string field) =>
        Field(Messages.Codes.AboutTooLong, Messages.AboutTooLong, field);

    public static AppError InvalidAccentColor(string field) =>
        Field(Messages.Codes.InvalidAccentColor, Messages.InvalidAccentColor, field);

    public static AppError LowContrastAccentColor(string field) =>
        Field(Messages.Codes.LowContrastAccentColor, Messages.LowContrastAccentColor, field);

    public static AppError InvalidImageType(string field) =>
        Field(Messages.Codes.InvalidImageType, Messages.InvalidImageType, field);

    public static AppError ImageTooLarge(string field, string message) =>
        Field(Messages.Codes.ImageTooLarge, message, field);

    public static AppError ImageMissing(string field) =>
        Field(Messages.Codes.ImageMissing, Messages.ImageMissing, field);

    private static AppError Field(string code, string message, string field) =>
        new(ErrorKind.Validation, code, message, new Dictionary<string, string[]> { [field] = [message] });
}

public sealed class Result<T>
{
    private readonly T? _value;
    private readonly AppError? _error;

    private Result(T? value, AppError? error) => (_value, _error) = (value, error);

    public bool IsSuccess => _error is null;

    public T Value => _error is null ? _value! : throw new InvalidOperationException("The result is a failure.");

    public AppError Error => _error ?? throw new InvalidOperationException("The result is a success.");

    public static implicit operator Result<T>(T value) => new(value, null);

    public static implicit operator Result<T>(AppError error) => new(default, error);
}

public sealed class Result
{
    private Result(AppError? error) => Error = error;

    public static readonly Result Success = new(null);

    public AppError? Error { get; }

    public bool IsSuccess => Error is null;

    public static implicit operator Result(AppError error) => new(error);
}
