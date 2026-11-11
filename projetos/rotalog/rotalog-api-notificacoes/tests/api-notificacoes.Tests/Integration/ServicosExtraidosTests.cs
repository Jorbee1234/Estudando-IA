using api_notificacoes.Canais;
using api_notificacoes.Configuration;
using api_notificacoes.Domain;
using api_notificacoes.Models;
using api_notificacoes.Services;
using api_notificacoes.Tests.Infra;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace api_notificacoes.Tests.Integration;

/// <summary>Testes diretos dos serviços extraídos (ADR 0001, fase 5), com banco real e canais determinísticos.</summary>
[Collection("api")]
public class ServicosExtraidosTests
{
    public ServicosExtraidosTests(ApiFactory factory)
    {
        Espera.FilaVazia(factory.Services);
        BancoDeTeste.Resetar();
    }

    private static NotificacaoProcessor Processor(Data.NotificacoesDbContext ctx, bool falha, int lote = 50)
    {
        var f = new FalhaFixa(falha);
        var canais = new ICanalNotificacao[]
        {
            new EmailCanal(Options.Create(new EmailOptions()), f, NullLogger<EmailCanal>.Instance),
            new SmsCanal(Options.Create(new SmsOptions()), f, NullLogger<SmsCanal>.Instance)
        };
        return new NotificacaoProcessor(ctx, canais, Options.Create(new NotificacaoOptions { TamanhoLote = lote }),
            NullLogger<NotificacaoProcessor>.Instance);
    }

    // ---------- TemplateRenderer ----------

    [Fact]
    public async Task Renderer_aplica_variaveis_no_corpo_e_no_assunto()
    {
        using var ctx = ContextoDeTeste.Criar();
        var r = await new TemplateRenderer(ctx).RenderizarAsync("ENTREGA_CRIADA", "email",
            new Dictionary<string, string> { ["numero_pedido"] = "P1", ["origem"] = "A", ["destino"] = "B" });

        Assert.NotNull(r);
        Assert.Equal("Nova entrega criada: P1", r!.Assunto);
        Assert.Contains("Pedido: P1", r.Mensagem);
        Assert.Contains("Destino: B", r.Mensagem);
    }

    [Fact]
    public async Task Renderer_devolve_null_sem_template_ativo()
    {
        using var ctx = ContextoDeTeste.Criar();
        var vars = new Dictionary<string, string> { ["x"] = "1" };
        var renderer = new TemplateRenderer(ctx);

        Assert.Null(await renderer.RenderizarAsync("NAO_EXISTE", "email", vars));
        Assert.Null(await renderer.RenderizarAsync("ENTREGA_CRIADA", "sms", vars)); // só existe em email

        BancoDeTeste.Executar("UPDATE notificacoes.templates_notificacao SET ativo = false WHERE tipo = 'ENTREGA_CRIADA'");
        Assert.Null(await renderer.RenderizarAsync("ENTREGA_CRIADA", "email", vars));
    }

    [Fact]
    public async Task Renderer_sem_assunto_no_template_devolve_assunto_null()
    {
        using var ctx = ContextoDeTeste.Criar();
        var r = await new TemplateRenderer(ctx).RenderizarAsync("ALERTA_MANUTENCAO", "sms",
            new Dictionary<string, string> { ["placa"] = "ABC", ["data_agendada"] = "hoje" });

        Assert.NotNull(r);
        Assert.Null(r!.Assunto);
        Assert.Contains("veículo ABC em hoje", r.Mensagem);
    }

    [Fact]
    public async Task Renderer_escapa_HTML_no_email_e_mantem_placeholder_ausente()
    {
        using var ctx = ContextoDeTeste.Criar();
        var r = await new TemplateRenderer(ctx).RenderizarAsync("VEICULO_DESATIVADO", "email",
            new Dictionary<string, string> { ["placa"] = "<b>X</b>" });

        Assert.Contains("&lt;b&gt;X&lt;/b&gt;", r!.Mensagem);
        Assert.Contains("{{motivo}}", r.Mensagem);
    }

    // ---------- NotificacaoProcessor ----------

    [Fact]
    public async Task Processor_sucesso_marca_ENVIADO_e_data_de_envio()
    {
        using var ctx = ContextoDeTeste.Criar();
        var n = await ctx.Notificacoes.SingleAsync(x => x.Id == 10);

        await Processor(ctx, falha: false).TentarEnviarAsync(n);

        using var leitura = ContextoDeTeste.Criar();
        var salvo = await leitura.Notificacoes.SingleAsync(x => x.Id == 10);
        Assert.Equal(StatusNotificacao.Enviado, salvo.Status);
        Assert.Equal(1, salvo.Tentativas);
        Assert.NotNull(salvo.DataEnvio);
    }

    [Fact]
    public async Task Processor_falha_antes_do_limite_mantem_PENDENTE_com_erro()
    {
        using var ctx = ContextoDeTeste.Criar();
        var n = await ctx.Notificacoes.SingleAsync(x => x.Id == 10);

        await Processor(ctx, falha: true).TentarEnviarAsync(n);

        Assert.Equal(StatusNotificacao.Pendente, n.Status);
        Assert.Equal(1, n.Tentativas);
        Assert.Equal("SMS API rate limit exceeded (simulated)", n.ErroMensagem);
        Assert.Null(n.DataEnvio);
    }

    [Fact]
    public async Task Processor_falha_na_ultima_tentativa_marca_FALHA()
    {
        using var ctx = ContextoDeTeste.Criar();
        var n = await ctx.Notificacoes.SingleAsync(x => x.Id == 10);
        n.Tentativas = n.MaxTentativas - 1;

        await Processor(ctx, falha: true).TentarEnviarAsync(n);

        Assert.Equal(StatusNotificacao.Falha, n.Status);
        Assert.Equal(n.MaxTentativas, n.Tentativas);
    }

    [Fact]
    public async Task Processor_canal_desconhecido_conta_tentativa_e_registra_erro()
    {
        using var ctx = ContextoDeTeste.Criar();
        var n = await ctx.Notificacoes.SingleAsync(x => x.Id == 10);
        n.Canal = "pombo";

        await Processor(ctx, falha: false).TentarEnviarAsync(n);

        Assert.Equal(StatusNotificacao.Pendente, n.Status);
        Assert.Equal(1, n.Tentativas);
        Assert.Equal("Canal não suportado: pombo", n.ErroMensagem);
    }

    [Fact]
    public async Task Processor_lote_respeita_TamanhoLote_configurado()
    {
        BancoDeTeste.Executar(@"INSERT INTO notificacoes.notificacoes (tipo, canal, destinatario, mensagem, status, tentativas, max_tentativas)
            SELECT 'LOTE', 'email', 'l@b.com', 'm', 'PENDENTE', 0, 3 FROM generate_series(1, 12)");
        using var ctx = ContextoDeTeste.Criar();

        var processadas = await Processor(ctx, falha: false, lote: 5).ProcessarPendentesAsync();

        Assert.Equal(5, processadas);
        Assert.Equal(7 + 1, BancoDeTeste.Escalar<int>("SELECT count(*) FROM notificacoes.notificacoes WHERE status = 'PENDENTE'"));
    }

    [Fact]
    public async Task Processor_lote_processa_os_mais_antigos_primeiro_e_ignora_os_sem_tentativas_restantes()
    {
        BancoDeTeste.Executar("UPDATE notificacoes.notificacoes SET tentativas = max_tentativas WHERE id = 10");
        BancoDeTeste.Executar(@"INSERT INTO notificacoes.notificacoes (tipo, canal, destinatario, mensagem, status, data_criacao)
            VALUES ('NOVA', 'email', 'a@b', 'm', 'PENDENTE', '2025-01-01'), ('VELHA', 'email', 'a@b', 'm', 'PENDENTE', '2020-01-01')");
        using var ctx = ContextoDeTeste.Criar();

        var processadas = await Processor(ctx, falha: false, lote: 1).ProcessarPendentesAsync();

        Assert.Equal(1, processadas);
        Assert.Equal("ENVIADO", BancoDeTeste.Escalar<string>("SELECT status FROM notificacoes.notificacoes WHERE tipo = 'VELHA'"));
        Assert.Equal("PENDENTE", BancoDeTeste.Escalar<string>("SELECT status FROM notificacoes.notificacoes WHERE tipo = 'NOVA'"));
    }

    [Fact]
    public void NotificacaoOptions_tem_lote_padrao_50()
    {
        Assert.Equal(50, new NotificacaoOptions().TamanhoLote);
    }

    // ---------- NotificacaoEstatisticaService ----------

    [Fact]
    public async Task Estatistica_conta_no_banco_com_o_seed()
    {
        using var ctx = ContextoDeTeste.Criar();
        var s = await new NotificacaoEstatisticaService(ctx).ObterAsync();

        Assert.Equal(10, s.Total);
        Assert.Equal(8, s.Enviadas);
        Assert.Equal(1, s.Pendentes);
        Assert.Equal(1, s.Falhas);
        Assert.Equal(2, s.PorTipo["ENTREGA_CRIADA"]);
        Assert.Equal(9, s.PorCanal["email"]);
        Assert.Equal(1, s.PorCanal["sms"]);
        Assert.Equal(s.Total, s.PorTipo.Values.Sum());
        Assert.Equal(s.Total, s.PorCanal.Values.Sum());
    }

    [Fact]
    public async Task Estatistica_com_tabela_vazia_zera_tudo()
    {
        BancoDeTeste.Executar("TRUNCATE notificacoes.notificacoes RESTART IDENTITY");
        using var ctx = ContextoDeTeste.Criar();
        var s = await new NotificacaoEstatisticaService(ctx).ObterAsync();

        Assert.Equal(0, s.Total);
        Assert.Equal(0, s.Enviadas + s.Pendentes + s.Falhas);
        Assert.Empty(s.PorTipo);
        Assert.Empty(s.PorCanal);
    }

    // ---------- Enum <-> texto no banco ----------

    [Fact]
    public async Task Status_e_gravado_como_texto_em_maiusculas()
    {
        using var ctx = ContextoDeTeste.Criar();
        ctx.Notificacoes.Add(new Notificacao
        {
            Tipo = "T", Canal = "email", Destinatario = "d", Mensagem = "m", Status = StatusNotificacao.Falha
        });
        await ctx.SaveChangesAsync();

        Assert.Equal("FALHA", BancoDeTeste.Escalar<string>("SELECT status FROM notificacoes.notificacoes WHERE tipo = 'T'"));
    }
}
