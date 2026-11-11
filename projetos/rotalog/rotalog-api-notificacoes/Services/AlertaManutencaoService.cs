using api_notificacoes.Configuration;
using api_notificacoes.Data;
using api_notificacoes.Domain;
using api_notificacoes.DTOs;
using api_notificacoes.Logging;
using api_notificacoes.Models;
using Microsoft.Extensions.Options;

namespace api_notificacoes.Services;

public interface IAlertaManutencaoService
{
    // Cria a notificação e envia na hora (sem a fila em memória). Nunca devolve PENDENTE.
    Task<AlertaManutencaoResponse> EnviarAsync(AlertaManutencaoRequest request);
}

public class AlertaManutencaoService : IAlertaManutencaoService
{
    public const string TipoAlerta = "MANUTENCAO_PREVENTIVA";
    public const string Origem = "api-frotas";

    private readonly NotificacoesDbContext _context;
    private readonly ITemplateRenderer _templates;
    private readonly INotificacaoProcessor _processor;
    private readonly NotificacaoOptions _options;
    private readonly ILogger<AlertaManutencaoService> _logger;

    public AlertaManutencaoService(
        NotificacoesDbContext context,
        ITemplateRenderer templates,
        INotificacaoProcessor processor,
        IOptions<NotificacaoOptions> options,
        ILogger<AlertaManutencaoService> logger)
    {
        _context = context;
        _templates = templates;
        _processor = processor;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AlertaManutencaoResponse> EnviarAsync(AlertaManutencaoRequest request)
    {
        var modelo = request.Modelo ?? string.Empty;
        var variaveis = new Dictionary<string, string>
        {
            ["placa"] = request.Placa,
            ["modelo"] = modelo,
            ["motivo"] = request.Motivo,
            ["km_atual"] = request.KmAtual.ToString()
        };

        var renderizado = await _templates.RenderizarAsync(TipoAlerta, CanalNotificacao.Email, variaveis);

        // Sem template ativo: mensagem montada aqui
        var assunto = renderizado?.Assunto ?? $"Manutenção preventiva - veículo {request.Placa}";
        var mensagem = !string.IsNullOrEmpty(renderizado?.Mensagem)
            ? renderizado!.Mensagem
            : $"O veículo {request.Placa} ({modelo}) precisa de manutenção preventiva: {request.Motivo}. Quilometragem atual: {request.KmAtual} km.";

        var notificacao = new Notificacao
        {
            Tipo = TipoAlerta,
            Canal = CanalNotificacao.Email,
            Destinatario = _options.EmailGestor,
            Assunto = assunto,
            Mensagem = mensagem,
            Status = StatusNotificacao.Pendente,
            ServicoOrigem = Origem,
            ReferenciaId = request.ReferenciaId,
            DataCriacao = DateTime.UtcNow,
            DataAtualizacao = DateTime.UtcNow
        };

        _context.Notificacoes.Add(notificacao);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Alerta de manutenção criado: {Id} - Veículo: {VeiculoId} - Destinatário: {Dest}",
            notificacao.Id, request.VeiculoId, Mascara.Destinatario(notificacao.Destinatario));

        await _processor.TentarEnviarAsync(notificacao);

        if (notificacao.Status == StatusNotificacao.Enviado)
            return new AlertaManutencaoResponse { NotificacaoId = notificacao.Id, Status = "ENVIADO" };

        // Quem chamou recebe a falha na hora e decide reprocessar: não deixa PENDENTE para o /processar reenviar por baixo
        notificacao.Status = StatusNotificacao.Falha;
        notificacao.ErroMensagem ??= "Falha no envio";
        notificacao.DataAtualizacao = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new AlertaManutencaoResponse
        {
            NotificacaoId = notificacao.Id,
            Status = "FALHA",
            Erro = notificacao.ErroMensagem
        };
    }
}
