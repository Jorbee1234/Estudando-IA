using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using api_notificacoes.Canais;
using api_notificacoes.Configuration;
using api_notificacoes.Tests.Infra;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace api_notificacoes.Tests.Integration;

/// <summary>Com o simulador de falha fixo, o envio e o retry deixam de depender de sorte (ADR 0001, fase 4).</summary>
[Collection("api")]
public class EnvioDeterministicoTests : IDisposable
{
    private readonly ApiFactory _base;
    private HttpClient? _http;

    public EnvioDeterministicoTests(ApiFactory factory)
    {
        _base = factory;
        Espera.FilaVazia(factory.Services);
        BancoDeTeste.Resetar();
    }

    private HttpClient Cliente(bool falha)
    {
        _http = _base.WithWebHostBuilder(b => b.ConfigureServices(s =>
            s.AddSingleton<IFalhaSimulada>(new FalhaFixa(falha)))).CreateClient();
        return _http;
    }

    public void Dispose() => _http?.Dispose();

    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    private static string StatusDe(long id) =>
        BancoDeTeste.Escalar<string>($"SELECT status FROM notificacoes.notificacoes WHERE id = {id}")!;

    [Theory]
    [InlineData("email")]
    [InlineData("sms")]
    public async Task Criar_sem_falha_fica_ENVIADO_com_uma_tentativa(string canal)
    {
        var http = Cliente(false);
        var r = await http.PostAsJsonAsync("/api/notificacoes",
            new { tipo = "T", destinatario = canal == "sms" ? "+5511999990001" : "d@x.com", mensagem = "m", canal });

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var j = await Json(r);
        // aceita para envio: PENDENTE, ainda sem tentativa
        Assert.Equal("PENDENTE", j.GetProperty("status").GetString());
        Assert.Equal(0, j.GetProperty("tentativas").GetInt32());
        var id = j.GetProperty("id").GetInt64();

        await Espera.NotificacaoTentadaAsync(id);
        var depois = await Json(await http.GetAsync($"/api/notificacoes/{id}"));
        Assert.Equal("ENVIADO", depois.GetProperty("status").GetString());
        Assert.Equal(1, depois.GetProperty("tentativas").GetInt32());
        Assert.Equal(JsonValueKind.Null, depois.GetProperty("erroMensagem").ValueKind);
        Assert.NotEqual(JsonValueKind.Null, depois.GetProperty("dataEnvio").ValueKind);
    }

    [Fact]
    public async Task Criar_com_falha_devolve_201_PENDENTE_e_o_erro_aparece_depois()
    {
        var http = Cliente(true);
        var r = await http.PostAsJsonAsync("/api/notificacoes",
            new { tipo = "T", destinatario = "d@x.com", mensagem = "m", canal = "email" });

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var j = await Json(r);
        Assert.Equal("PENDENTE", j.GetProperty("status").GetString());
        Assert.Equal(0, j.GetProperty("tentativas").GetInt32());
        Assert.Equal(JsonValueKind.Null, j.GetProperty("erroMensagem").ValueKind);
        var id = j.GetProperty("id").GetInt64();

        await Espera.NotificacaoTentadaAsync(id);
        var depois = await Json(await http.GetAsync($"/api/notificacoes/{id}"));
        Assert.Equal("PENDENTE", depois.GetProperty("status").GetString());
        Assert.Equal(1, depois.GetProperty("tentativas").GetInt32());
        Assert.Equal("SMTP connection timeout (simulated)", depois.GetProperty("erroMensagem").GetString());
    }

    [Fact]
    public async Task Falhas_sucessivas_via_processar_levam_a_FALHA_na_terceira_tentativa()
    {
        var http = Cliente(true);
        var criada = await Json(await http.PostAsJsonAsync("/api/notificacoes",
            new { tipo = "T", destinatario = "+5511999990001", mensagem = "m", canal = "sms" }));
        var id = criada.GetProperty("id").GetInt64();
        await Espera.NotificacaoTentadaAsync(id); // 1ª tentativa, em segundo plano

        await http.PostAsync("/api/notificacoes/processar", null); // 2ª tentativa
        Assert.Equal("PENDENTE", StatusDe(id));

        await http.PostAsync("/api/notificacoes/processar", null); // 3ª tentativa
        Assert.Equal("FALHA", StatusDe(id));
        Assert.Equal(3, BancoDeTeste.Escalar<int>($"SELECT tentativas FROM notificacoes.notificacoes WHERE id = {id}"));
        Assert.Equal("SMS API rate limit exceeded (simulated)",
            BancoDeTeste.Escalar<string>($"SELECT erro_mensagem FROM notificacoes.notificacoes WHERE id = {id}"));
    }

    [Fact]
    public async Task Processar_sem_falha_envia_a_pendente_do_seed()
    {
        var j = await Json(await Cliente(false).PostAsync("/api/notificacoes/processar", null));
        Assert.Equal(1, j.GetProperty("processadas").GetInt32());
        Assert.Equal("ENVIADO", StatusDe(10));
    }

    [Fact]
    public async Task Reenviar_sem_falha_leva_FALHA_para_ENVIADO_e_limpa_o_erro()
    {
        BancoDeTeste.Executar("UPDATE notificacoes.notificacoes SET erro_mensagem = 'antigo' WHERE id = 8");
        var http = Cliente(false);
        var j = await Json(await http.PostAsJsonAsync("/api/notificacoes/8/reenviar", new { }));
        Assert.Equal("PENDENTE", j.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, j.GetProperty("erroMensagem").ValueKind);

        await Espera.NotificacaoTentadaAsync(8, 4);
        var depois = await Json(await http.GetAsync("/api/notificacoes/8"));
        Assert.Equal("ENVIADO", depois.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, depois.GetProperty("erroMensagem").ValueKind);
    }

    [Fact]
    public void Opcoes_sao_ligadas_as_secoes_EmailSettings_e_SmsSettings()
    {
        using var scope = _base.Services.CreateScope();
        var email = scope.ServiceProvider.GetRequiredService<IOptions<EmailOptions>>().Value;
        var sms = scope.ServiceProvider.GetRequiredService<IOptions<SmsOptions>>().Value;

        Assert.False(string.IsNullOrEmpty(email.SmtpServer));
        Assert.Equal(587, email.SmtpPort);
        Assert.False(string.IsNullOrEmpty(email.SenderEmail));
        Assert.False(string.IsNullOrEmpty(sms.ApiUrl));
    }

    [Fact]
    public void Os_dois_canais_estao_registrados()
    {
        using var scope = _base.Services.CreateScope();
        var nomes = scope.ServiceProvider.GetServices<ICanalNotificacao>().Select(c => c.Nome).OrderBy(n => n).ToArray();
        Assert.Equal(new[] { "email", "sms" }, nomes);
    }
}
