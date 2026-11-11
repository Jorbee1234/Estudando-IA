using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using api_notificacoes.Tests.Infra;

namespace api_notificacoes.Tests.Contract;

/// <summary>Contratos consumidos pela api-frotas (NotificacaoClient) e formato de /api/health. ADR 0001, seção 10.</summary>
public class ContratoTests : TesteDeApi
{
    public ContratoTests(ApiFactory f) : base(f) { }

    [Fact]
    public async Task Payload_de_email_da_api_frotas_gera_201()
    {
        // NotificacaoClient.enviarNotificacao: tipo, destinatario, mensagem, canal="email"
        var r = await Http.PostAsJsonAsync("/api/notificacoes", new Dictionary<string, string>
        {
            ["tipo"] = "VEICULO_CADASTRADO", ["destinatario"] = "operacao@rotalog.com",
            ["mensagem"] = "Veículo ABC1D23 cadastrado", ["canal"] = "email"
        });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        Assert.NotNull(r.Headers.Location);
    }

    [Fact]
    public async Task Payload_de_sms_da_api_frotas_gera_201()
    {
        // NotificacaoClient.enviarSms: tipo="SMS", canal="sms"
        var r = await Http.PostAsJsonAsync("/api/notificacoes", new Dictionary<string, string>
        {
            ["tipo"] = "SMS", ["destinatario"] = "+5511999990001", ["mensagem"] = "alerta", ["canal"] = "sms"
        });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        Assert.Equal("sms", (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("canal").GetString());
    }

    [Fact]
    public async Task Erro_de_validacao_tem_o_formato_error()
    {
        var r = await Http.PostAsJsonAsync("/api/notificacoes", new { destinatario = "a@b.com", mensagem = "m" });
        var j = await r.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(new[] { "error" }, j.EnumerateObject().Select(p => p.Name).ToArray());
    }

    [Fact]
    public async Task Health_tem_o_formato_enxuto_sem_configuracao_nem_outros_schemas()
    {
        var r = await Http.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await r.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(new[] { "dependencies", "service", "status", "timestamp", "version" },
            j.EnumerateObject().Select(p => p.Name).OrderBy(x => x).ToArray());
        Assert.Equal("api-notificacoes", j.GetProperty("service").GetString());
        Assert.Equal("UP", j.GetProperty("status").GetString());
        Assert.Equal("1.0.0", j.GetProperty("version").GetString());

        var dep = j.GetProperty("dependencies");
        Assert.Equal("UP", dep.GetProperty("database").GetString());
        // sem frotas_db, entregas_db (contagens de outros schemas) nem configuration (ADR 0001, D3 e D7)
        Assert.Equal(new[] { "database" }, dep.EnumerateObject().Select(p => p.Name).ToArray());
    }
}
