using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using api_notificacoes.Canais;
using api_notificacoes.Envio;
using api_notificacoes.Tests.Infra;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace api_notificacoes.Tests.Integration;

/// <summary>POST /api/notificacoes/alerta-manutencao: envio síncrono, sem a fila em memória.</summary>
[Collection("api")]
public class AlertaManutencaoTests : IDisposable
{
    private readonly ApiFactory _base;
    private readonly FilaEspia _fila = new();
    private HttpClient? _http;

    public AlertaManutencaoTests(ApiFactory factory)
    {
        _base = factory;
        Espera.FilaVazia(factory.Services);
        BancoDeTeste.Resetar();
    }

    public void Dispose() => _http?.Dispose();

    private HttpClient Cliente(bool falha)
    {
        _http = _base.WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddSingleton<IFalhaSimulada>(new FalhaFixa(falha));
            s.AddSingleton<IFilaEnvio>(_fila);
        })).CreateClient();
        return _http;
    }

    private static object Corpo(string placa = "ABC1D23", string motivo = "Revisão por quilometragem") => new
    {
        veiculoId = 7L,
        placa,
        modelo = "Volvo FH",
        motivo,
        kmAtual = 61000L,
        kmBase = 10000L,
        dataBase = "2026-01-15",
        referenciaId = "alerta-7"
    };

    private static async Task<JsonElement> Json(HttpResponseMessage r) => await r.Content.ReadFromJsonAsync<JsonElement>();

    [Fact]
    public async Task Envio_com_sucesso_devolve_200_ENVIADO_e_a_notificacao_fica_consultavel()
    {
        var http = Cliente(false);
        var r = await http.PostAsJsonAsync("/api/notificacoes/alerta-manutencao", Corpo());

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await Json(r);
        Assert.Equal("ENVIADO", j.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, j.GetProperty("erro").ValueKind);
        var id = j.GetProperty("notificacaoId").GetInt64();

        var n = await Json(await http.GetAsync($"/api/notificacoes/{id}"));
        Assert.Equal("ENVIADO", n.GetProperty("status").GetString());
        Assert.Equal("MANUTENCAO_PREVENTIVA", n.GetProperty("tipo").GetString());
        Assert.Equal("email", n.GetProperty("canal").GetString());
        Assert.Equal("api-frotas", n.GetProperty("servicoOrigem").GetString());
        Assert.Equal("alerta-7", n.GetProperty("referenciaId").GetString());
        Assert.False(string.IsNullOrEmpty(n.GetProperty("destinatario").GetString()));
        Assert.Contains("ABC1D23", n.GetProperty("mensagem").GetString());
        Assert.Equal(1, n.GetProperty("tentativas").GetInt32());
    }

    [Fact]
    public async Task Canal_que_lanca_devolve_200_FALHA_com_erro_preenchido()
    {
        var http = Cliente(true);
        var r = await http.PostAsJsonAsync("/api/notificacoes/alerta-manutencao", Corpo());

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await Json(r);
        Assert.Equal("FALHA", j.GetProperty("status").GetString());
        Assert.Equal("SMTP connection timeout (simulated)", j.GetProperty("erro").GetString());
        var id = j.GetProperty("notificacaoId").GetInt64();

        var n = await Json(await http.GetAsync($"/api/notificacoes/{id}"));
        Assert.Equal("FALHA", n.GetProperty("status").GetString());
    }

    [Theory]
    [InlineData("", "motivo", "placa")]
    [InlineData("ABC1D23", "", "motivo")]
    public async Task Placa_ou_motivo_ausente_devolve_400_com_error(string placa, string motivo, string campo)
    {
        var r = await Cliente(false).PostAsJsonAsync("/api/notificacoes/alerta-manutencao", Corpo(placa, motivo));

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Contains($"'{campo}'", (await Json(r)).GetProperty("error").GetString());
        Assert.Equal(0, BancoDeTeste.Escalar<int>(
            "SELECT count(*) FROM notificacoes.notificacoes WHERE tipo = 'MANUTENCAO_PREVENTIVA'"));
    }

    [Fact]
    public async Task Data_base_fora_do_formato_devolve_400()
    {
        var r = await Cliente(false).PostAsJsonAsync("/api/notificacoes/alerta-manutencao",
            new { veiculoId = 1L, placa = "ABC1D23", motivo = "m", kmAtual = 1L, dataBase = "15/01/2026" });

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Contains("dataBase", (await Json(r)).GetProperty("error").GetString());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Nao_passa_pela_fila_e_ja_tem_a_tentativa_registrada_ao_responder(bool falha)
    {
        var http = Cliente(falha);
        var j = await Json(await http.PostAsJsonAsync("/api/notificacoes/alerta-manutencao", Corpo()));
        var id = j.GetProperty("notificacaoId").GetInt64();

        Assert.Equal(0, _fila.Chamadas);
        Assert.Equal(1, BancoDeTeste.Escalar<int>($"SELECT tentativas FROM notificacoes.notificacoes WHERE id = {id}"));
    }

    private sealed class FilaEspia : IFilaEnvio
    {
        private int _chamadas;
        public int Chamadas => Volatile.Read(ref _chamadas);

        public bool TentarEnfileirar(long notificacaoId, int tentativasEsperadas)
        {
            Interlocked.Increment(ref _chamadas);
            return true;
        }
    }
}
