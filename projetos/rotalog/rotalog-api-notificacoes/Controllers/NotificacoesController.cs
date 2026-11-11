using Microsoft.AspNetCore.Mvc;
using api_notificacoes.Configuration;
using api_notificacoes.DTOs;
using api_notificacoes.Services;
using FluentValidation;
using Microsoft.AspNetCore.RateLimiting;

namespace api_notificacoes.Controllers;

// Sem autenticação: ADR 0001, seção 3. Erros inesperados vão para o GlobalExceptionHandler.
[ApiController]
[Route("api/[controller]")]
public class NotificacoesController : ControllerBase
{
    private readonly INotificacaoService _service;
    private readonly INotificacaoProcessor _processor;
    private readonly INotificacaoEstatisticaService _estatisticas;
    private readonly IValidator<NotificacaoRequest> _validator;
    private readonly IValidator<ReenvioRequest> _reenvioValidator;
    private readonly IAlertaManutencaoService _alertas;
    private readonly IValidator<AlertaManutencaoRequest> _alertaValidator;

    public NotificacoesController(
        INotificacaoService service,
        INotificacaoProcessor processor,
        INotificacaoEstatisticaService estatisticas,
        IValidator<NotificacaoRequest> validator,
        IValidator<ReenvioRequest> reenvioValidator,
        IAlertaManutencaoService alertas,
        IValidator<AlertaManutencaoRequest> alertaValidator)
    {
        _alertas = alertas;
        _alertaValidator = alertaValidator;
        _service = service;
        _processor = processor;
        _estatisticas = estatisticas;
        _validator = validator;
        _reenvioValidator = reenvioValidator;
    }

    [HttpGet]
    public async Task<IActionResult> Listar(
        [FromQuery] string? tipo,
        [FromQuery] string? status,
        [FromQuery] string? canal,
        [FromQuery] string? servicoOrigem)
    {
        var notificacoes = await _service.ListarNotificacoes(tipo, status, canal, servicoOrigem);
        return Ok(notificacoes);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> BuscarPorId(long id)
    {
        var notificacao = await _service.BuscarPorId(id);
        if (notificacao == null)
            return NotFound(new { error = "Notificação não encontrada" });

        return Ok(notificacao);
    }

    // Endpoint chamado pela api-frotas (e, no futuro, pela api-entregas)
    [HttpPost]
    [EnableRateLimiting(RateLimitOptions.PoliticaEscrita)]
    public async Task<IActionResult> Criar([FromBody] NotificacaoRequest request)
    {
        var validacao = await _validator.ValidateAsync(request);
        if (!validacao.IsValid)
            return BadRequest(new { error = validacao.Errors[0].ErrorMessage });

        var notificacao = await _service.CriarNotificacao(request);
        return CreatedAtAction(nameof(BuscarPorId), new { id = notificacao.Id }, notificacao);
    }

    // Alerta de manutenção preventiva (api-frotas): envio síncrono, sem a fila em memória
    [HttpPost("alerta-manutencao")]
    [EnableRateLimiting(RateLimitOptions.PoliticaEscrita)]
    public async Task<IActionResult> AlertaManutencao([FromBody] AlertaManutencaoRequest request)
    {
        var validacao = await _alertaValidator.ValidateAsync(request);
        if (!validacao.IsValid)
            return BadRequest(new { error = validacao.Errors[0].ErrorMessage });

        var resposta = await _alertas.EnviarAsync(request);
        return Ok(resposta);
    }

    [HttpPost("{id}/reenviar")]
    [EnableRateLimiting(RateLimitOptions.PoliticaEscrita)]
    public async Task<IActionResult> Reenviar(long id, [FromBody] ReenvioRequest? request)
    {
        if (request != null)
        {
            var validacao = await _reenvioValidator.ValidateAsync(request);
            if (!validacao.IsValid)
                return BadRequest(new { error = validacao.Errors[0].ErrorMessage });
        }

        var notificacao = await _service.ReenviarNotificacao(id, request);
        if (notificacao == null)
            return NotFound(new { error = "Notificação não encontrada" });

        return Ok(notificacao);
    }

    // "stats" e "templates" não conflitam com "{id}" porque id é long
    [HttpGet("stats")]
    public async Task<IActionResult> Estatisticas()
    {
        var stats = await _estatisticas.ObterAsync();
        return Ok(stats);
    }

    [HttpGet("templates")]
    public async Task<IActionResult> ListarTemplates([FromQuery] bool? apenasAtivos)
    {
        var templates = await _service.ListarTemplates(apenasAtivos);
        return Ok(templates);
    }

    // Sem autenticação e exposto como endpoint: ADR 0001, D4
    [HttpPost("processar")]
    public async Task<IActionResult> ProcessarPendentes()
    {
        var processadas = await _processor.ProcessarPendentesAsync();
        return Ok(new { processadas, timestamp = DateTime.UtcNow });
    }
}
