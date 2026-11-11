using api_notificacoes.Configuration;
using api_notificacoes.Domain;
using api_notificacoes.Logging;
using api_notificacoes.Models;
using Microsoft.Extensions.Options;

namespace api_notificacoes.Canais;

// Envio simulado: atraso e falha simulada, nada é enviado de verdade (ADR 0001, seção 1)
public class EmailCanal : ICanalNotificacao
{
    private readonly EmailOptions _options;
    private readonly IFalhaSimulada _falha;
    private readonly ILogger<EmailCanal> _logger;

    public EmailCanal(IOptions<EmailOptions> options, IFalhaSimulada falha, ILogger<EmailCanal> logger)
    {
        _options = options.Value;
        _falha = falha;
        _logger = logger;
    }

    public string Nome => CanalNotificacao.Email;

    public async Task EnviarAsync(Notificacao notificacao, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("[EMAIL FAKE] Enviando para {Dest} via {Smtp}:{Port}",
            Mascara.Destinatario(notificacao.Destinatario), _options.SmtpServer, _options.SmtpPort);
        _logger.LogInformation("[EMAIL FAKE] De: {From} | Assunto: {Subject}",
            _options.SenderEmail, notificacao.Assunto);

        await Task.Delay(100, cancellationToken);

        if (_falha.DeveFalhar(Nome))
            throw new Exception("SMTP connection timeout (simulated)");
    }
}
