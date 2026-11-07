using Api.Application.Models;
using Api.Domain;
using Api.Dtos;

namespace Api.Mapping;

public static class ResponseMapper
{
    private static string AvatarUrl(Guid userId, long version) => $"/api/profiles/{userId}/avatar?v={version}";

    public static AuthorResponse ToResponse(this AuthorView author) =>
        new(author.Id, author.Name, author.Handle,
            author.AvatarVersion is { } version ? AvatarUrl(author.Id, version) : null);

    public static PostResponse ToResponse(this PostView post, bool authenticated)
    {
        var href = $"/api/posts/{post.Id}";
        List<Link> links =
        [
            new("self", href, "GET"),
            new("comments", $"{href}/comments", "GET"),
        ];
        if (authenticated)
        {
            links.Add(post.LikedByMe
                ? new Link("unlike", $"{href}/likes/me", "DELETE")
                : new Link("like", $"{href}/likes/me", "PUT"));
            links.Add(new Link("comment", $"{href}/comments", "POST"));
        }

        return new PostResponse(
            post.Id, post.Title, post.Description, post.ThumbnailUrl, post.Tags,
            post.LikesCount, post.CommentsCount, post.LikedByMe, post.CreatedAt,
            post.Author.ToResponse(), links);
    }

    public static CommentResponse ToResponse(this CommentView comment, Guid postId) =>
        new(comment.Id, comment.Body, comment.CreatedAt, comment.Author.ToResponse(),
            [new Link("post", $"/api/posts/{postId}", "GET")]);

    public static TagResponse ToResponse(this TagView tag) => new(tag.Name, tag.PostsCount);

    public static UserResponse ToResponse(this User user) =>
        new(user.Id, user.Name, user.Email,
        [
            new Link("self", "/api/users/me", "GET"),
            new Link("token", "/api/tokens", "POST"),
        ]);

    public static ProfileResponse ToResponse(this ProfileView profile, bool isOwner)
    {
        var href = $"/api/profiles/{profile.Id}";
        List<Link> links =
        [
            new("self", href, "GET"),
            new("posts", $"/api/posts?authorId={profile.Id}", "GET"),
        ];
        if (profile.HasAvatar) links.Add(new Link("avatar", $"{href}/avatar", "GET"));
        if (profile.HasBanner) links.Add(new Link("banner", $"{href}/banner", "GET"));
        var nextChange = Username.NextChangeAt(profile.UsernameChangedAt, DateTime.UtcNow);
        if (isOwner)
        {
            links.Add(new Link("update", "/api/profiles/me", "PATCH"));
            links.Add(new Link("upload-avatar", "/api/profiles/me/avatar", "PUT"));
            links.Add(new Link("upload-banner", "/api/profiles/me/banner", "PUT"));
            if (profile.HasAvatar) links.Add(new Link("remove-avatar", "/api/profiles/me/avatar", "DELETE"));
            if (profile.HasBanner) links.Add(new Link("remove-banner", "/api/profiles/me/banner", "DELETE"));
        }

        return new ProfileResponse(
            profile.Id, profile.Name, profile.Handle, profile.About, profile.AccentColor,
            profile.HasAvatar ? $"{href}/avatar?v={profile.Version}" : null,
            profile.HasBanner ? $"{href}/banner?v={profile.Version}" : null,
            profile.PostsCount, nextChange, links);
    }

    public static PagedResponse<PostResponse> ToResponse(
        this Page<PostView> page, bool authenticated, IReadOnlyList<Link> links) =>
        new(page.Items.Select(p => p.ToResponse(authenticated)).ToList(), page.NextCursor, links);

    public static PagedResponse<CommentResponse> ToResponse(
        this Page<CommentView> page, Guid postId, IReadOnlyList<Link> links) =>
        new(page.Items.Select(c => c.ToResponse(postId)).ToList(), page.NextCursor, links);
}
