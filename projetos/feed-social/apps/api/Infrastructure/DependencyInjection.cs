using Api.Application.Abstractions;
using Api.Domain;
using Api.Infrastructure.Persistence;
using Api.Infrastructure.Repositories;
using Api.Infrastructure.Security;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Api.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<JwtOptions>()
            .BindConfiguration("Jwt")
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Default")
                ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.")));

        services.AddScoped<IUserStore, EfUserStore>();
        services.AddScoped<IPostRepository, EfPostRepository>();
        services.AddScoped<IPostQueries, EfPostQueries>();
        services.AddScoped<ICommentRepository, EfCommentRepository>();
        services.AddScoped<ITagRepository, EfTagRepository>();
        services.AddScoped<IProfileRepository, EfProfileRepository>();
        services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
        services.AddSingleton<ITokenService, JwtTokenService>();

        return services;
    }
}
