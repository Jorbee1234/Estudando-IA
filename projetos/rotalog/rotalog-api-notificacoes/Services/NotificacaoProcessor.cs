using api_notificacoes.Canais;
using api_notificacoes.Configuration;
using api_notificacoes.Data;
using api_notificacoes.Domain;
using api_notificacoes.Logging;
using api_notificacoes.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace api_notificacoes.Services;

public interface INotificacaoProcessor
{
    // Uma tentativa de envio: conta a tentativa, atualiza o status e grava
    Task TentarEnviarAsync(Notificacao notificacao);

    // Lote de pendentes com tentativas restantes; devolve quantas foram processadas
    Task<int> ProcessarPendentesAsync();
}

// Sem lock nem controle de concorrência: duas chamadas simultâneas pegam as mesmas pendentes (ADR 0001, seção 2)
public class NotificacaoProcessor : INotificacaoProcessor
{
    private readonly NotificacoesDbContext _context;
    private readonly IEnumerable<ICanalNotificacao> _canais;
    private readonly NotificacaoOptions _options;
    private readonly ILogger<NotificacaoProcessor> _logger;

    public NotificacaoProcessor(
        NotificacoesDbContext context,
        IEnumerable<ICanalNotificacao> canais,
        IOptions<NotificacaoOptions> options,
        ILogger<NotificacaoProcessor> logger)
    {
        _context = context;
        _canais = canais;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<int> ProcessarPendentesAsync()
    {
        var pendentes = await _context.Notificacoes
            .Where(n => n.Status == StatusNotificacao.Pendente && n.Tentativas < n.MaxTentativas)
            .OrderBy(n => n.DataCriacao)
            .Take(_options.TamanhoLote)
            .ToListAsync();

        var processadas = 0;
        foreach (var notificacao in pendentes)
        {
            await TentarEnviarAsync(notificacao);
            processadas++;
        }

        _logger.LogInformation("Processadas {Count} notificações pendentes", processadas);
        return processadas;
    }

    public async Task TentarEnviarAsync(Notificacao notificacao)
    {
        try
        {
            notificacao.Tentativas++;
            notificacao.DataAtualizacao = DateTime.UtcNow;

            var canal = _canais.FirstOrDefault(c => c.Nome == notificacao.Canal)
                ?? throw new NotSupportedException($"Canal não suportado: {notificacao.Canal}");
            await canal.EnviarAsync(notificacao);

            notificacao.Status = StatusNotificacao.Enviado;
            notificacao.DataEnvio = DateTime.UtcNow;

            _logger.LogInformation("Notificação enviada: {Id} via {Canal} para {Dest}",
                notificacao.Id, notificacao.Canal, Mascara.Destinatario(notificacao.Destinatario));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao enviar notificação {Id}: {Msg}", notificacao.Id, ex.Message);

            notificacao.ErroMensagem = ex.Message;

            if (notificacao.Tentativas >= notificacao.MaxTentativas)
            {
                notificacao.Status = StatusNotificacao.Falha;
                _logger.LogWarning("Notificação {Id} marcada como FALHA após {Tentativas} tentativas",
                    notificacao.Id, notificacao.Tentativas);
            }
        }

        await _context.SaveChangesAsync();
    }
}
