using Api.Application.Common;
using Api.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Api.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected Guid? CurrentUserId => User.GetUserId();

    protected IActionResult Fail(AppError error)
    {
        var status = error.Kind switch
        {
            ErrorKind.Validation => StatusCodes.Status400BadRequest,
            ErrorKind.Unauthorized => StatusCodes.Status401Unauthorized,
            ErrorKind.NotFound => StatusCodes.Status404NotFound,
            ErrorKind.Conflict => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status500InternalServerError,
        };
        var title = Messages.Titles.For(status);

        ProblemDetails problem;
        if (error.Fields is { Count: > 0 })
        {
            var modelState = new ModelStateDictionary();
            foreach (var (field, messages) in error.Fields)
            {
                foreach (var message in messages)
                {
                    modelState.AddModelError(field, message);
                }
            }

            problem = ProblemDetailsFactory.CreateValidationProblemDetails(
                HttpContext, modelState, status, title, detail: error.Message);
        }
        else
        {
            problem = ProblemDetailsFactory.CreateProblemDetails(HttpContext, status, title, detail: error.Message);
        }

        problem.Extensions["code"] = error.Code;
        return new ObjectResult(problem) { StatusCode = status };
    }

    protected IActionResult ToActionResult<T>(Result<T> result, Func<T, IActionResult> onSuccess) =>
        result.IsSuccess ? onSuccess(result.Value) : Fail(result.Error);

    protected IActionResult ToActionResult(Result result, Func<IActionResult> onSuccess) =>
        result.Error is { } error ? Fail(error) : onSuccess();

    protected void MarkPrivateCache()
    {
        Response.Headers.CacheControl = "private, no-cache";
        Response.Headers.Vary = "Authorization";
    }

    protected void MarkNoStore() => Response.Headers.CacheControl = "no-store";
}
