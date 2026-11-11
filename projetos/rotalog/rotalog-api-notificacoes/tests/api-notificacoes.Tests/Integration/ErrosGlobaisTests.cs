using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using api_notificacoes.DTOs;
using api_notificacoes.Models;
using api_notificacoes.Services;
using api_notificacoes.Tests.Infra;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace api_notificacoes.Tests.Integration;

/// <summary>
/// GlobalExceptionHandler no lugar dos 7 try/catch (ADR 0001, fase 5). O corpo 500 continua { error, detalhes }
/// com a mensagem de cada action; "detalhes" só sai na fase 6.
/// </summary>
[Collection("api")]
public class ErrosGlobaisTests : IDisposable
{
    private readonly HttpClient _http;

    public ErrosGlobaisTests(ApiFactory factory)
    {
        Espera.FilaVazia(factory.Services);
        BancoDeTeste.Resetar();
        _http = factory.WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddScoped<INotificacaoService, ServicoQueQuebra>();
            s.AddScoped<INotificacaoProcessor, ServicoQueQuebra>();
            s.AddScoped<INotificacaoEstatisticaService, ServicoQueQuebra>();
        })).CreateClient();
    }

    public void Dispose() => _http.Dispose();

    private class ServicoQueQuebra : INotificacaoService, INotificacaoProcessor, INotificacaoEstatisticaService
    {
        private static Exception Boom() => new InvalidOperationException("boom");

        public Task<List<NotificacaoResponse>> ListarNotificacoes(string? tipo, string? status, string? canal, string? servicoOrigem) => throw Boom();
        public Task<NotificacaoResponse?> BuscarPorId(long id) => throw Boom();
        public Task<NotificacaoResponse> CriarNotificacao(NotificacaoRequest request) => throw Boom();
        public Task<NotificacaoResponse?> ReenviarNotificacao(long id, ReenvioRequest? request) => throw Boom();
        public Task<List<TemplateNotificacao>> ListarTemplates(bool? apenasAtivos) => throw Boom();
        public Task TentarEnviarAsync(Notificacao notificacao) => throw Boom();
        public Task<int> ProcessarPendentesAsync() => throw Boom();
        public Task<NotificacaoStats> ObterAsync() => throw Boom();
    }

    private static StringContent Json(string s) => new(s, Encoding.UTF8, "application/json");

    public static IEnumerable<object[]> Casos() => new[]
    {
        new object[] { "GET", "/api/notificacoes", "", "Erro ao listar notificações" },
        new object[] { "GET", "/api/notificacoes/1", "", "Erro ao buscar notificação" },
        new object[] { "POST", "/api/notificacoes", "{\"tipo\":\"T\",\"destinatario\":\"d@x.com\",\"mensagem\":\"m\"}", "Erro ao criar notificação" },
        new object[] { "POST", "/api/notificacoes/1/reenviar", "{}", "Erro ao reenviar notificação" },
        new object[] { "GET", "/api/notificacoes/stats", "", "Erro ao obter estatísticas" },
        new object[] { "GET", "/api/notificacoes/templates", "", "Erro ao listar templates" },
        new object[] { "POST", "/api/notificacoes/processar", "", "Erro ao processar pendentes" },
    };

    [Theory]
    [MemberData(nameof(Casos))]
    public async Task Excecao_vira_500_com_a_mensagem_da_action_sem_detalhes(string metodo, string rota, string corpo, string mensagem)
    {
        var req = new HttpRequestMessage(new HttpMethod(metodo), rota);
        if (corpo != "") req.Content = Json(corpo);

        var r = await _http.SendAsync(req);

        Assert.Equal(HttpStatusCode.InternalServerError, r.StatusCode);
        Assert.StartsWith("application/json", r.Content.Headers.ContentType!.MediaType);
        var j = await r.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(mensagem, j.GetProperty("error").GetString());
        Assert.Equal(new[] { "error" }, j.EnumerateObject().Select(p => p.Name).ToArray()); // mensagem interna só no log
        Assert.DoesNotContain("boom", await r.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Validacao_do_controller_continua_400_sem_chamar_o_servico()
    {
        // o serviço lança em tudo; se fosse chamado, seria 500
        var r = await _http.PostAsync("/api/notificacoes", Json("{\"destinatario\":\"d@x.com\",\"mensagem\":\"m\"}"));
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }

    [Fact]
    public async Task Rota_inexistente_e_json_malformado_nao_viram_500()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await _http.GetAsync("/api/nao-existe")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _http.PostAsync("/api/notificacoes", Json("{ nao eh json"))).StatusCode);
    }
}
