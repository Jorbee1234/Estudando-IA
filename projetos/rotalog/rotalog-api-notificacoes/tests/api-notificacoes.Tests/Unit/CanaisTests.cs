using api_notificacoes.Canais;
using api_notificacoes.Configuration;
using api_notificacoes.Models;
using api_notificacoes.Tests.Infra;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace api_notificacoes.Tests.Unit;

public class CanaisTests
{
    private static Notificacao Notif() => new()
    {
        Destinatario = "a@b.com", Assunto = "as", Mensagem = new string('x', 300)
    };

    private static EmailCanal Email(bool falha) =>
        new(Options.Create(new EmailOptions { SmtpServer = "smtp.x", SmtpPort = 587, SenderEmail = "n@x" }),
            new FalhaFixa(falha), NullLogger<EmailCanal>.Instance);

    private static SmsCanal Sms(bool falha) =>
        new(Options.Create(new SmsOptions { ApiUrl = "http://sms.x" }),
            new FalhaFixa(falha), NullLogger<SmsCanal>.Instance);

    [Fact]
    public void Nomes_dos_canais_sao_os_valores_gravados_em_Notificacao_Canal()
    {
        Assert.Equal("email", Email(false).Nome);
        Assert.Equal("sms", Sms(false).Nome);
    }

    [Fact]
    public async Task Email_sem_falha_nao_lanca()
    {
        await Email(false).EnviarAsync(Notif());
    }

    [Fact]
    public async Task Email_com_falha_lanca_a_mensagem_atual()
    {
        var ex = await Assert.ThrowsAsync<Exception>(() => Email(true).EnviarAsync(Notif()));
        Assert.Equal("SMTP connection timeout (simulated)", ex.Message);
    }

    [Fact]
    public async Task Sms_sem_falha_nao_lanca()
    {
        await Sms(false).EnviarAsync(Notif());
    }

    [Fact]
    public async Task Sms_com_falha_lanca_a_mensagem_atual()
    {
        var ex = await Assert.ThrowsAsync<Exception>(() => Sms(true).EnviarAsync(Notif()));
        Assert.Equal("SMS API rate limit exceeded (simulated)", ex.Message);
    }

    [Fact]
    public async Task Cancelamento_interrompe_o_envio()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Email(false).EnviarAsync(Notif(), cts.Token));
    }

    [Fact]
    public void FalhaSimuladaAleatoria_so_falha_nos_canais_conhecidos()
    {
        var f = new FalhaSimuladaAleatoria();
        Assert.All(Enumerable.Range(0, 200), _ => Assert.False(f.DeveFalhar("pombo")));
        Assert.Contains(Enumerable.Range(0, 2000), _ => f.DeveFalhar("email"));
        Assert.Contains(Enumerable.Range(0, 2000), _ => f.DeveFalhar("sms"));
    }
}
