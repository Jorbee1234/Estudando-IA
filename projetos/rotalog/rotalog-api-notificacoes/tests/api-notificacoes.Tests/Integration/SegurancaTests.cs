using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using api_notificacoes.Canais;
using api_notificacoes.Tests.Infra;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Serilog.Core;
using Serilog.Events;

namespace api_notificacoes.Tests.Integration;

/// <summary>Segurança sem mudança de contrato, health real e logs (ADR 0001, fase 6: D3, D5, D7).</summary>
[Collection("api")]
public class SegurancaTests
{
    private readonly ApiFactory _base;

    public SegurancaTests(ApiFactory factory)
    {
        _base = factory;
        Espera.FilaVazia(factory.Services);
        BancoDeTeste.Resetar();
    }

    private HttpClient Cliente(Action<IWebHostBuilder> configurar, bool seguirRedirect = true) =>
        _base.WithWebHostBuilder(configurar).CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = seguirRedirect
        });

    private static object Valido(string canal = "email") => new
    {
        tipo = "T", canal, mensagem = "m",
        destinatario = canal == "sms" ? "+5511999990001" : "a@b.com"
    };

    // ---------- Swagger ----------

    [Fact]
    public async Task Swagger_responde_em_Development_e_404_em_Production()
    {
        using var dev = Cliente(b => b.UseEnvironment("Development"));
        Assert.Equal(HttpStatusCode.OK, (await dev.GetAsync("/swagger/v1/swagger.json")).StatusCode);

        using var prod = Cliente(b => b.UseEnvironment("Production"));
        Assert.Equal(HttpStatusCode.NotFound, (await prod.GetAsync("/swagger/v1/swagger.json")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await prod.GetAsync("/swagger")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await prod.GetAsync("/api/notificacoes/stats")).StatusCode); // API segue de pé
    }

    // ---------- HTTPS ----------

    [Fact]
    public async Task Fora_de_Development_redireciona_para_HTTPS_e_em_Development_nao()
    {
        using var prod = Cliente(b => b.UseEnvironment("Production").UseSetting("https_port", "5001"), seguirRedirect: false);
        var r = await prod.GetAsync("/api/notificacoes/stats");
        Assert.True(r.StatusCode is HttpStatusCode.TemporaryRedirect or HttpStatusCode.RedirectKeepVerb);
        Assert.StartsWith("https://localhost:5001/", r.Headers.Location!.ToString());

        using var dev = Cliente(b => b.UseEnvironment("Development").UseSetting("https_port", "5001"), seguirRedirect: false);
        Assert.Equal(HttpStatusCode.OK, (await dev.GetAsync("/api/notificacoes/stats")).StatusCode);
    }

    // ---------- CORS e hosts ----------

    [Fact]
    public async Task Cors_usa_as_origens_da_configuracao()
    {
        using var http = Cliente(b => b.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(
            new Dictionary<string, string?> { ["Cors:Origens:0"] = "https://painel.rotalog.exemplo" })));

        var certa = new HttpRequestMessage(HttpMethod.Get, "/api/notificacoes/stats");
        certa.Headers.Add("Origin", "https://painel.rotalog.exemplo");
        Assert.Equal("https://painel.rotalog.exemplo", (await http.SendAsync(certa)).Headers.GetValues("Access-Control-Allow-Origin").Single());

        var padrao = new HttpRequestMessage(HttpMethod.Get, "/api/notificacoes/stats");
        padrao.Headers.Add("Origin", "http://localhost:4200"); // o padrão deixa de valer quando há configuração
        Assert.False((await http.SendAsync(padrao)).Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Host_fora_de_AllowedHosts_e_recusado()
    {
        using var http = Cliente(b => b.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(
            new Dictionary<string, string?> { ["AllowedHosts"] = "localhost" })));

        var estranho = new HttpRequestMessage(HttpMethod.Get, "/api/notificacoes/stats");
        estranho.Headers.Host = "mal.exemplo";
        Assert.Equal(HttpStatusCode.BadRequest, (await http.SendAsync(estranho)).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await http.GetAsync("/api/notificacoes/stats")).StatusCode);
    }

    // ---------- Limites ----------

    [Fact]
    public void Corpo_da_requisicao_tem_limite_explicito_de_1_MB()
    {
        var kestrel = _base.Services.GetRequiredService<IOptions<KestrelServerOptions>>().Value;
        Assert.Equal(1_048_576, kestrel.Limits.MaxRequestBodySize);
    }

    [Fact]
    public async Task Rate_limit_barra_o_POST_de_criar_e_de_reenviar_mas_nao_as_leituras()
    {
        using var http = Cliente(b =>
        {
            b.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(
                new Dictionary<string, string?> { ["RateLimit:Limite"] = "3", ["RateLimit:JanelaSegundos"] = "60" }));
            b.ConfigureServices(s => s.AddSingleton<IFalhaSimulada>(new FalhaFixa(false)));
        });

        for (var i = 0; i < 3; i++)
            Assert.Equal(HttpStatusCode.Created, (await http.PostAsJsonAsync("/api/notificacoes", Valido())).StatusCode);

        Assert.Equal(HttpStatusCode.TooManyRequests, (await http.PostAsJsonAsync("/api/notificacoes", Valido())).StatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await http.PostAsJsonAsync("/api/notificacoes/1/reenviar", new { })).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await http.GetAsync("/api/notificacoes")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await http.GetAsync("/api/health")).StatusCode);
    }

    // ---------- Validação de entrada ----------

    public static IEnumerable<object[]> Invalidos() => new[]
    {
        new object[] { new { tipo = new string('t', 51), destinatario = "a@b.com", mensagem = "m" }, "Campo 'tipo' deve ter no máximo 50 caracteres" },
        new object[] { new { tipo = "T", canal = "pombo", destinatario = "a@b.com", mensagem = "m" }, "Campo 'canal' deve ser 'email' ou 'sms'" },
        new object[] { new { tipo = "T", canal = "EMAIL", destinatario = "a@b.com", mensagem = "m" }, "Campo 'canal' deve ser 'email' ou 'sms'" },
        new object[] { new { tipo = "T", canal = "email", destinatario = "sem-arroba", mensagem = "m" }, "Campo 'destinatario' deve ser um e-mail válido para o canal email" },
        new object[] { new { tipo = "T", destinatario = "+5511999990001", mensagem = "m" }, "Campo 'destinatario' deve ser um e-mail válido para o canal email" },
        new object[] { new { tipo = "T", canal = "sms", destinatario = "a@b.com", mensagem = "m" }, "Campo 'destinatario' deve ser um telefone válido (só dígitos, com + opcional) para o canal sms" },
        new object[] { new { tipo = "T", canal = "sms", destinatario = "123", mensagem = "m" }, "Campo 'destinatario' deve ser um telefone válido (só dígitos, com + opcional) para o canal sms" },
        new object[] { new { tipo = "T", destinatario = "a@b.com", mensagem = "m", assunto = new string('a', 256) }, "Campo 'assunto' deve ter no máximo 255 caracteres" },
        new object[] { new { tipo = "T", destinatario = "a@b.com", mensagem = new string('m', 10_001) }, "Campo 'mensagem' deve ter no máximo 10000 caracteres" },
        new object[] { new { tipo = "T", destinatario = "a@b.com", mensagem = "m", servicoOrigem = new string('s', 51) }, "Campo 'servicoOrigem' deve ter no máximo 50 caracteres" },
        new object[] { new { tipo = "T", destinatario = "a@b.com", mensagem = "m", referenciaId = new string('r', 101) }, "Campo 'referenciaId' deve ter no máximo 100 caracteres" },
        new object[] { new { tipo = "T", destinatario = "a@b.com", variaveis = Enumerable.Range(0, 51).ToDictionary(i => $"k{i}", _ => "v") }, "Campo 'variaveis' deve ter no máximo 50 itens" },
        new object[] { new { tipo = "T", destinatario = "a@b.com", variaveis = new Dictionary<string, string> { [new string('k', 101)] = "v" } }, "Chaves de 'variaveis' devem ser preenchidas e ter no máximo 100 caracteres" },
        new object[] { new { tipo = "T", destinatario = "a@b.com", variaveis = new Dictionary<string, string> { ["k"] = new string('v', 1001) } }, "Valores de 'variaveis' devem ter no máximo 1000 caracteres" },
    };

    [Theory]
    [MemberData(nameof(Invalidos))]
    public async Task Criar_invalido_devolve_400_com_error(object corpo, string erro)
    {
        using var http = _base.CreateClient();
        var r = await http.PostAsJsonAsync("/api/notificacoes", corpo);

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        var j = await r.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(erro, j.GetProperty("error").GetString());
        Assert.Equal(0, BancoDeTeste.Escalar<int>("SELECT count(*) FROM notificacoes.notificacoes WHERE tipo = 'T'"));
    }

    [Fact]
    public async Task Mensagem_ausente_e_vazia_sao_distinguidas_e_ambas_exigem_variaveis()
    {
        using var http = _base.CreateClient();
        foreach (var corpo in new object[]
                 {
                     new { tipo = "T", destinatario = "a@b.com" },
                     new { tipo = "T", destinatario = "a@b.com", mensagem = "" }
                 })
        {
            var r = await http.PostAsJsonAsync("/api/notificacoes", corpo);
            Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
            Assert.Equal("Campo 'mensagem' ou 'variaveis' é obrigatório",
                (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetString());
        }
    }

    [Fact]
    public async Task Reenviar_valida_formato_do_destinatario_contra_o_canal_que_ficara()
    {
        using var http = Cliente(b => b.ConfigureServices(s => s.AddSingleton<IFalhaSimulada>(new FalhaFixa(false))));

        // id 1 é email (operacao@rotalog.com): trocar só o canal para sms deixa um e-mail num canal de telefone
        var soCanal = await http.PostAsJsonAsync("/api/notificacoes/1/reenviar", new { novoCanal = "sms" });
        Assert.Equal(HttpStatusCode.BadRequest, soCanal.StatusCode);
        Assert.Contains("telefone válido", (await soCanal.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetString());

        // só o destinatário, inválido para o canal atual (email)
        var soDestino = await http.PostAsJsonAsync("/api/notificacoes/1/reenviar", new { novoDestinatario = "123" });
        Assert.Equal(HttpStatusCode.BadRequest, soDestino.StatusCode);
        Assert.Contains("e-mail válido", (await soDestino.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("error").GetString());

        // nada foi alterado nas recusas
        Assert.Equal("email", BancoDeTeste.Escalar<string>("SELECT canal FROM notificacoes.notificacoes WHERE id = 1"));
        Assert.Equal(1, BancoDeTeste.Escalar<int>("SELECT tentativas FROM notificacoes.notificacoes WHERE id = 1"));

        // par consistente passa
        var ok = await http.PostAsJsonAsync("/api/notificacoes/1/reenviar",
            new { novoCanal = "sms", novoDestinatario = "+5511999990001" });
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var j = await ok.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("sms", j.GetProperty("canal").GetString());
        Assert.Equal("+5511999990001", j.GetProperty("destinatario").GetString());
    }

    [Fact]
    public async Task Reenviar_sem_corpo_ou_com_corpo_vazio_continua_valido()
    {
        using var http = Cliente(b => b.ConfigureServices(s => s.AddSingleton<IFalhaSimulada>(new FalhaFixa(false))));
        Assert.Equal(HttpStatusCode.OK, (await http.PostAsJsonAsync("/api/notificacoes/1/reenviar", new { })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await http.PostAsJsonAsync("/api/notificacoes/2/reenviar", new { novoDestinatario = "novo@rotalog.com" })).StatusCode);
    }

    // ---------- Health ----------

    private class CheckFixo : IHealthCheck
    {
        private readonly HealthStatus _status;
        public CheckFixo(HealthStatus status) => _status = status;
        public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default) =>
            Task.FromResult(new HealthCheckResult(_status, exception: _status == HealthStatus.Unhealthy ? new Exception("db fora") : null));
    }

    [Fact]
    public async Task Health_com_banco_fora_do_ar_devolve_DOWN_e_DEGRADED_sem_derrubar_a_resposta()
    {
        using var http = Cliente(b => b.ConfigureServices(s => s.Configure<HealthCheckServiceOptions>(o =>
        {
            o.Registrations.Clear();
            o.Registrations.Add(new HealthCheckRegistration("database", new CheckFixo(HealthStatus.Unhealthy), null, null));
        })));

        var r = await http.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("DEGRADED", j.GetProperty("status").GetString());
        Assert.Equal("DOWN", j.GetProperty("dependencies").GetProperty("database").GetString());
        Assert.DoesNotContain("db fora", await r.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Health_nao_toca_nos_schemas_de_frotas_e_entregas()
    {
        BancoDeTeste.Executar("ALTER TABLE frotas.veiculos RENAME TO veiculos_oculta");
        try
        {
            var j = await (await _base.CreateClient().GetAsync("/api/health")).Content.ReadFromJsonAsync<JsonElement>();
            Assert.Equal("UP", j.GetProperty("status").GetString());
            Assert.Equal("UP", j.GetProperty("dependencies").GetProperty("database").GetString());
        }
        finally
        {
            BancoDeTeste.Executar("ALTER TABLE frotas.veiculos_oculta RENAME TO veiculos");
        }
    }

    // ---------- Subida sem banco ----------

    [Fact]
    public void Subida_sem_banco_falha_em_vez_de_subir_mesmo_assim()
    {
        using var semBanco = new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
            b.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] =
                    "Host=127.0.0.1;Port=1;Database=x;Username=x;Password=x;SearchPath=notificacoes;Timeout=2;Command Timeout=2"
            })));

        var erro = Assert.ThrowsAny<Exception>(() => semBanco.CreateClient());
        Assert.Contains("Banco de dados indisponível", erro.ToString());
    }

    // ---------- Logs ----------

    private class ColetorDeLogs : ILogEventSink
    {
        private readonly List<string> _mensagens = new();
        public void Emit(LogEvent logEvent)
        {
            lock (_mensagens) _mensagens.Add(logEvent.RenderMessage());
        }
        public List<string> Mensagens { get { lock (_mensagens) return _mensagens.ToList(); } }
    }

    [Fact]
    public async Task Logs_nao_trazem_destinatario_completo_nem_corpo_da_mensagem()
    {
        var coletor = new ColetorDeLogs();
        using var host = _base.WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddSingleton<ILogEventSink>(coletor);
            s.AddSingleton<IFalhaSimulada>(new FalhaFixa(false));
        }));
        using var http = host.CreateClient();

        await http.PostAsJsonAsync("/api/notificacoes",
            new { tipo = "T", canal = "email", destinatario = "maria.silva@example.com", mensagem = "SEGREDO-NO-CORPO-123" });
        await http.PostAsJsonAsync("/api/notificacoes",
            new { tipo = "T", canal = "sms", destinatario = "+5511988887777", mensagem = "SEGREDO-NO-SMS-456" });
        Espera.FilaVazia(host.Services); // os logs de envio acontecem em segundo plano
        Assert.Contains(coletor.Mensagens, m => m.Contains("Notificação enviada"));

        var todos = string.Join("\n", coletor.Mensagens);
        Assert.NotEmpty(coletor.Mensagens);
        Assert.DoesNotContain("maria.silva@example.com", todos);
        Assert.DoesNotContain("+5511988887777", todos);
        Assert.DoesNotContain("5511988887777", todos);
        Assert.DoesNotContain("SEGREDO-NO-CORPO-123", todos);
        Assert.DoesNotContain("SEGREDO-NO-SMS-456", todos);
        Assert.Contains("m***@example.com", todos);
        Assert.Contains("***7777", todos);
    }

    [Fact]
    public async Task Log_de_requisicao_nao_traz_query_string()
    {
        var coletor = new ColetorDeLogs();
        using var http = Cliente(b => b.ConfigureServices(s => s.AddSingleton<ILogEventSink>(coletor)));

        await http.GetAsync("/api/notificacoes?tipo=SEGREDO_NA_QUERY");

        var todos = string.Join("\n", coletor.Mensagens);
        Assert.Contains("/api/notificacoes", todos);
        Assert.DoesNotContain("SEGREDO_NA_QUERY", todos);
    }
}
