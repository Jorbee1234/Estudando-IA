using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using api_notificacoes.Canais;
using api_notificacoes.Configuration;
using api_notificacoes.Envio;
using api_notificacoes.Models;
using api_notificacoes.Tests.Infra;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace api_notificacoes.Tests.Integration;

/// <summary>
/// O envio sai da requisição (ADR 0001, D4): Channel + BackgroundService. O contrato com a api-frotas e a
/// api-entregas não muda: mesma rota, mesmo corpo, 201 e Location; só o estado devolvido é o de "aceita".
/// </summary>
[Collection("api")]
public class EnvioEmSegundoPlanoTests
{
    private readonly ApiFactory _base;

    public EnvioEmSegundoPlanoTests(ApiFactory factory)
    {
        _base = factory;
        Espera.FilaVazia(factory.Services);
        BancoDeTeste.Resetar();
    }

    private static string StatusDe(long id) =>
        BancoDeTeste.Escalar<string>($"SELECT status FROM notificacoes.notificacoes WHERE id = {id}")!;

    private static int TentativasDe(long id) =>
        BancoDeTeste.Escalar<int>($"SELECT tentativas FROM notificacoes.notificacoes WHERE id = {id}");

    private WebApplicationFactory<Program> Host(Action<IWebHostBuilder>? configurar = null) =>
        _base.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s => s.AddSingleton<IFalhaSimulada>(new FalhaFixa(false)));
            configurar?.Invoke(b);
        });

    private class CanalBloqueado : ICanalNotificacao
    {
        public readonly TaskCompletionSource Liberar = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public readonly TaskCompletionSource Iniciou = new(TaskCreationOptions.RunContinuationsAsynchronously);
        public string Nome => "email";

        public async Task EnviarAsync(Notificacao notificacao, CancellationToken cancellationToken = default)
        {
            Iniciou.TrySetResult();
            await Liberar.Task;
        }
    }

    private class FilaCheia : IFilaEnvio
    {
        public bool TentarEnfileirar(long notificacaoId, int tentativasEsperadas) => false;
    }

    // ---------- A requisição não espera o envio ----------

    [Fact]
    public async Task Criar_responde_201_enquanto_o_envio_ainda_esta_bloqueado()
    {
        var canal = new CanalBloqueado();
        using var host = Host(b => b.ConfigureServices(s =>
        {
            s.RemoveAll<ICanalNotificacao>();
            s.AddSingleton<ICanalNotificacao>(canal);
        }));
        using var http = host.CreateClient();

        var r = await http.PostAsJsonAsync("/api/notificacoes",
            new { tipo = "T", destinatario = "a@b.com", mensagem = "m", canal = "email" });

        // a resposta chegou, e o canal ainda nem terminou (nem poderia: está preso)
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        Assert.NotNull(r.Headers.Location);
        var j = await r.Content.ReadFromJsonAsync<JsonElement>();
        var id = j.GetProperty("id").GetInt64();
        Assert.Equal("PENDENTE", j.GetProperty("status").GetString());

        await canal.Iniciou.Task.WaitAsync(TimeSpan.FromSeconds(10)); // o worker pegou o item
        Assert.Equal("PENDENTE", StatusDe(id));

        canal.Liberar.SetResult();
        await Espera.AteAsync(() => StatusDe(id) == "ENVIADO", "notificação ficar ENVIADO");
        Assert.Equal(1, TentativasDe(id));
    }

    [Fact]
    public async Task Reenviar_tambem_responde_antes_do_envio()
    {
        var canal = new CanalBloqueado();
        using var host = Host(b => b.ConfigureServices(s =>
        {
            s.RemoveAll<ICanalNotificacao>();
            s.AddSingleton<ICanalNotificacao>(canal);
        }));
        using var http = host.CreateClient();

        var r = await http.PostAsJsonAsync("/api/notificacoes/1/reenviar", new { });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        Assert.Equal("PENDENTE", (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("status").GetString());
        canal.Liberar.SetResult();
        await Espera.NotificacaoTentadaAsync(1, 2);
    }

    // ---------- Falha de envio não afeta a resposta de criação ----------

    [Fact]
    public async Task Falha_de_envio_nao_muda_a_resposta_de_criacao_e_fica_visivel_no_GET()
    {
        using var host = _base.WithWebHostBuilder(b => b.ConfigureServices(s =>
            s.AddSingleton<IFalhaSimulada>(new FalhaFixa(true))));
        using var http = host.CreateClient();

        var r = await http.PostAsJsonAsync("/api/notificacoes",
            new { tipo = "T", destinatario = "+5511999990001", mensagem = "m", canal = "sms" });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var id = (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt64();

        await Espera.NotificacaoTentadaAsync(id);
        var visto = await (await http.GetAsync($"/api/notificacoes/{id}")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("PENDENTE", visto.GetProperty("status").GetString());
        Assert.Equal("SMS API rate limit exceeded (simulated)", visto.GetProperty("erroMensagem").GetString());
    }

    // ---------- Fila cheia não perde nem derruba ----------

    [Fact]
    public async Task Fila_cheia_ainda_responde_201_e_a_notificacao_fica_PENDENTE_para_o_processar()
    {
        using var host = Host(b => b.ConfigureServices(s =>
            s.Replace(ServiceDescriptor.Singleton<IFilaEnvio>(new FilaCheia()))));
        using var http = host.CreateClient();

        var r = await http.PostAsJsonAsync("/api/notificacoes",
            new { tipo = "T", destinatario = "a@b.com", mensagem = "m", canal = "email" });

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var id = (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt64();
        await Task.Delay(300);
        Assert.Equal("PENDENTE", StatusDe(id));
        Assert.Equal(0, TentativasDe(id));

        var processar = await (await http.PostAsync("/api/notificacoes/processar", null)).Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(2, processar.GetProperty("processadas").GetInt32()); // a nova e a pendente do seed
        Assert.Equal("ENVIADO", StatusDe(id));
    }

    [Fact]
    public void FilaEnvio_cheia_recusa_sem_contar_como_em_andamento()
    {
        var fila = new FilaEnvio(Options.Create(new EnvioOptions { Capacidade = 1 }));

        Assert.True(fila.TentarEnfileirar(1, 0));
        Assert.False(fila.TentarEnfileirar(2, 0));
        Assert.Equal(1, fila.EmAndamento);

        fila.Concluir();
        Assert.Equal(0, fila.EmAndamento);
    }

    // ---------- Worker ----------

    [Fact]
    public async Task Worker_envia_o_item_enfileirado()
    {
        using var host = Host();
        using var http = host.CreateClient();
        var fila = host.Services.GetRequiredService<IFilaEnvio>();

        Assert.True(fila.TentarEnfileirar(10, 0));

        await Espera.AteAsync(() => StatusDe(10) == "ENVIADO", "pendente do seed ser enviada");
    }

    [Fact]
    public async Task Worker_descarta_item_que_ja_foi_tentado_por_outro_caminho()
    {
        using var host = Host();
        using var http = host.CreateClient();
        var fila = host.Services.GetRequiredService<IFilaEnvio>();

        fila.TentarEnfileirar(10, 5);    // esperava 5 tentativas, a notificação tem 0
        fila.TentarEnfileirar(1, 1);     // já ENVIADA
        fila.TentarEnfileirar(99999, 0); // não existe
        Espera.FilaVazia(host.Services);

        Assert.Equal("PENDENTE", StatusDe(10));
        Assert.Equal(0, TentativasDe(10));
        Assert.Equal(1, TentativasDe(1));

        // e o worker continua vivo depois dos descartes
        fila.TentarEnfileirar(10, 0);
        await Espera.AteAsync(() => StatusDe(10) == "ENVIADO", "worker seguir processando");
    }

    [Fact]
    public async Task Na_inicializacao_reenfileira_pendentes_sem_tentativa()
    {
        BancoDeTeste.Executar("UPDATE notificacoes.notificacoes SET tentativas = 1 WHERE id = 10");
        BancoDeTeste.Executar(@"INSERT INTO notificacoes.notificacoes (id, tipo, canal, destinatario, mensagem, status, tentativas)
            VALUES (500, 'RECUPERA', 'email', 'a@b.com', 'm', 'PENDENTE', 0)");

        using var host = Host(b => b.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(
            new Dictionary<string, string?> { ["Envio:RecuperarPendentesNaInicializacao"] = "true" })));
        using var http = host.CreateClient();

        await Espera.AteAsync(() => StatusDe(500) == "ENVIADO", "pendente sem tentativa ser recuperada");
        Assert.Equal("PENDENTE", StatusDe(10)); // já tinha tentativa: é do /processar, não da recuperação
        Assert.Equal(1, TentativasDe(10));
    }

    [Fact]
    public async Task Sem_recuperacao_configurada_a_inicializacao_nao_toca_nas_pendentes()
    {
        using var host = Host();
        using var http = host.CreateClient();
        await Task.Delay(300);

        Assert.Equal("PENDENTE", StatusDe(10));
        Assert.Equal(0, TentativasDe(10));
    }
}
