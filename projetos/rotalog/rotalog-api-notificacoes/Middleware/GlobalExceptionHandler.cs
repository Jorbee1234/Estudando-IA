using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc.Controllers;

namespace api_notificacoes.Middleware;

// Substitui o try/catch repetido em cada action. Resposta { error }: a mensagem interna da exceção vai só para
// o log, nunca para o cliente. Trocar { error } por ProblemDetails é a fase 7 (ADR 0001, D4).
public class GlobalExceptionHandler : IExceptionHandler
{
    private static readonly Dictionary<string, string> MensagemPorAction = new()
    {
        ["Listar"] = "Erro ao listar notificações",
        ["BuscarPorId"] = "Erro ao buscar notificação",
        ["Criar"] = "Erro ao criar notificação",
        ["Reenviar"] = "Erro ao reenviar notificação",
        ["Estatisticas"] = "Erro ao obter estatísticas",
        ["ListarTemplates"] = "Erro ao listar templates",
        ["ProcessarPendentes"] = "Erro ao processar pendentes"
    };

    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        // Pedido malformado (corpo grande demais, por exemplo) segue como 4xx, não vira 500
        if (exception is BadHttpRequestException bad)
        {
            httpContext.Response.StatusCode = bad.StatusCode;
            return true;
        }

        // Validação feita dentro do serviço (reenvio): 400 com a primeira mensagem
        if (exception is ValidationException validacao)
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsJsonAsync(
                new { error = validacao.Errors.FirstOrDefault()?.ErrorMessage ?? validacao.Message }, cancellationToken);
            return true;
        }

        // O middleware limpa o endpoint antes de chamar o handler; o original vem na feature
        var endpoint = httpContext.Features.Get<IExceptionHandlerFeature>()?.Endpoint ?? httpContext.GetEndpoint();
        var action = endpoint?.Metadata.GetMetadata<ControllerActionDescriptor>()?.ActionName;
        var mensagem = action != null && MensagemPorAction.TryGetValue(action, out var m) ? m : "Erro interno";

        _logger.LogError(exception, "{Mensagem}", mensagem);

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await httpContext.Response.WriteAsJsonAsync(new { error = mensagem }, cancellationToken);
        return true;
    }
}
