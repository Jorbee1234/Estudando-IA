using api_notificacoes.Configuration;
using api_notificacoes.Domain;
using api_notificacoes.Logging;
using api_notificacoes.Models;
using Microsoft.Extensions.Options;

namespace api_notificacoes.Canais;

// Envio simulado: atraso e falha simulada, nada é enviado de verdade (ADR 0001, seção 1)
public class SmsCanal : ICanalNotificacao
{
    private readonly SmsOptions _options;
    private readonly IFalhaSimulada _falha;
    private readonly ILogger<SmsCanal> _logger;

    public SmsCanal(IOptions<SmsOptions> options, IFalhaSimulada falha, ILogger<SmsCanal> logger)
    {
        _options = options.Value;
        _falha = falha;
        _logger = logger;
    }

    public string Nome => CanalNotificacao.Sms;

    public async Task EnviarAsync(Notificacao notificacao, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[SMS FAKE] Enviando para {Dest} via {Url}",
            Mascara.Destinatario(notificacao.Destinatario), _options.ApiUrl);

        await Task.Delay(50, cancellationToken);

        if (_falha.DeveFalhar(Nome))
            throw new Exception("SMS API rate limit exceeded (simulated)");
    }
}
