using api_notificacoes.Configuration;
using api_notificacoes.Data;
using api_notificacoes.Domain;
using api_notificacoes.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace api_notificacoes.Envio;

// Consome a fila e faz uma tentativa de envio por item, fora da requisição. Falha com tentativas restantes
// deixa a notificação PENDENTE para /processar (retry com backoff é o item de envio real, ADR 0001, D4).
public class EnvioEmBackground : BackgroundService
{
    private readonly FilaEnvio _fila;
    private readonly IServiceScopeFactory _escopos;
    private readonly EnvioOptions _options;
    private readonly ILogger<EnvioEmBackground> _logger;

    public EnvioEmBackground(
        FilaEnvio fila,
        IServiceScopeFactory escopos,
        IOptions<EnvioOptions> options,
        ILogger<EnvioEmBackground> logger)
    {
        _fila = fila;
        _escopos = escopos;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_options.RecuperarPendentesNaInicializacao)
            await RecuperarPendentesAsync(stoppingToken);

        try
        {
            await foreach (var item in _fila.Leitor.ReadAllAsync(stoppingToken))
            {
                try
                {
                    await ProcessarAsync(item);
                }
                catch (Exception ex)
                {
                    // Um item ruim não derruba o worker; a notificação segue no banco
                    _logger.LogError(ex, "Falha ao processar o envio da notificação {Id}", item.NotificacaoId);
                }
                finally
                {
                    _fila.Concluir();
                }
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // encerramento: o que sobrou na fila continua PENDENTE e é recuperado na próxima subida
        }
    }

    private async Task ProcessarAsync(EnvioPendente item)
    {
        using var escopo = _escopos.CreateScope();
        var contexto = escopo.ServiceProvider.GetRequiredService<NotificacoesDbContext>();
        var processor = escopo.ServiceProvider.GetRequiredService<INotificacaoProcessor>();

        var notificacao = await contexto.Notificacoes.FindAsync(item.NotificacaoId);
        if (notificacao == null
            || notificacao.Status != StatusNotificacao.Pendente
            || notificacao.Tentativas != item.TentativasEsperadas)
        {
            _logger.LogDebug("Envio da notificação {Id} descartado: já tratada ou removida", item.NotificacaoId);
            return;
        }

        await processor.TentarEnviarAsync(notificacao);
    }

    private async Task RecuperarPendentesAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var escopo = _escopos.CreateScope();
            var contexto = escopo.ServiceProvider.GetRequiredService<NotificacoesDbContext>();

            var ids = await contexto.Notificacoes
                .Where(n => n.Status == StatusNotificacao.Pendente && n.Tentativas == 0)
                .OrderBy(n => n.DataCriacao)
                .Select(n => n.Id)
                .Take(_options.Capacidade)
                .ToListAsync(cancellationToken);

            foreach (var id in ids)
                _fila.TentarEnfileirar(id, 0);

            if (ids.Count > 0)
                _logger.LogInformation("{Count} notificações pendentes reenfileiradas na inicialização", ids.Count);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Não foi possível recuperar as notificações pendentes na inicialização");
        }
    }
}
