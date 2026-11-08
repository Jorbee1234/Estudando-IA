using Api.Application.Comments;
using Api.Application.Posts;
using Api.Application.Profiles;
using Api.Application.Tags;
using Api.Application.Users;
using Microsoft.Extensions.DependencyInjection;

namespace Api.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<PostService>();
        services.AddScoped<CommentService>();
        services.AddScoped<TagService>();
        services.AddScoped<UserService>();
        services.AddScoped<AuthService>();
        services.AddScoped<ProfileService>();
        return services;
    }
}
