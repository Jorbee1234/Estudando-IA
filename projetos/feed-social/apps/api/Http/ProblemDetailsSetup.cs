using Api.Application.Common;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;

namespace Api.Http;

public static class ProblemDetailsSetup
{
    public static IServiceCollection AddStandardProblemDetails(this IServiceCollection services)
    {
        services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
        {
            var problem = context.ProblemDetails;
            var status = problem.Status ?? context.HttpContext.Response.StatusCode;
            problem.Title = Messages.Titles.For(status);

            switch (status)
            {
                case StatusCodes.Status401Unauthorized:
                    problem.Detail ??= Messages.Unauthenticated;
                    problem.Extensions.TryAdd("code", Messages.Codes.Unauthenticated);
                    break;
                case StatusCodes.Status403Forbidden:
                    problem.Detail ??= Messages.Forbidden;
                    problem.Extensions.TryAdd("code", Messages.Codes.Forbidden);
                    break;
                case >= StatusCodes.Status500InternalServerError:
                    problem.Detail = Messages.ServerError;
                    problem.Extensions["code"] = Messages.Codes.ServerError;
                    break;
            }
        });

        services.Configure<ApiBehaviorOptions>(options =>
            options.InvalidModelStateResponseFactory = context =>
            {
                var factory = context.HttpContext.RequestServices.GetRequiredService<ProblemDetailsFactory>();
                var problem = factory.CreateValidationProblemDetails(
                    context.HttpContext,
                    context.ModelState,
                    StatusCodes.Status400BadRequest,
                    Messages.Titles.BadRequest,
                    detail: Messages.ValidationFailed);
                problem.Extensions["code"] = Messages.Codes.ValidationFailed;

                return new ObjectResult(problem) { StatusCode = StatusCodes.Status400BadRequest };
            });

        return services;
    }
}
