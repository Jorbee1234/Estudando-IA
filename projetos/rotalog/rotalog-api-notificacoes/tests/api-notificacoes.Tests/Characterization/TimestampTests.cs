using System.Net.Http.Json;
using System.Text.Json;
using api_notificacoes.Tests.Infra;

namespace api_notificacoes.Tests.Characterization;

/// <summary>
/// Risco da troca de runtime/Npgsql (ADR 0001, D4b): DateTime.UtcNow gravado em colunas "timestamp" (sem fuso).
/// Fixa o que é gravado e o que a API devolve.
/// </summary>
public class TimestampTests : TesteDeApi
{
    public TimestampTests(ApiFactory f) : base(f) { }

    [Fact]
    public async Task DataCriacao_e_gravada_em_UTC_e_devolvida_sem_deslocamento()
    {
        var antes = DateTime.UtcNow;
        var r = await Http.PostAsJsonAsync("/api/notificacoes", new { tipo = "TS", destinatario = "a@b.com", mensagem = "m" });
        var depois = DateTime.UtcNow;
        var j = await r.Content.ReadFromJsonAsync<JsonElement>();
        var id = j.GetProperty("id").GetInt64();

        // valor cru no banco (timestamp sem fuso), lido como texto
        var cru = BancoDeTeste.Escalar<string>($"SELECT to_char(data_criacao, 'YYYY-MM-DD\"T\"HH24:MI:SS') FROM notificacoes.notificacoes WHERE id = {id}")!;
        var gravado = DateTime.Parse(cru, null, System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal);
        Assert.InRange(gravado, antes.AddSeconds(-2), depois.AddSeconds(2));

        // resposta do POST usa a entidade em memória (Kind=Utc): termina em "Z"
        var texto = j.GetProperty("dataCriacao").GetString()!;
        Assert.EndsWith("Z", texto);
        Assert.StartsWith(cru, texto);

        // lido do banco (Kind=Unspecified): mesma hora, sem "Z" nem offset
        var lido = await (await Http.GetAsync($"/api/notificacoes/{id}")).Content.ReadFromJsonAsync<JsonElement>();
        var textoLido = lido.GetProperty("dataCriacao").GetString()!;
        Assert.DoesNotMatch(@"(Z|[+-]\d{2}:\d{2})$", textoLido);
        Assert.StartsWith(cru, textoLido);
    }

    [Fact]
    public async Task Seed_e_lido_sem_deslocamento_de_fuso()
    {
        var j = await (await Http.GetAsync("/api/notificacoes/1")).Content.ReadFromJsonAsync<JsonElement>();
        Assert.StartsWith("2024-01-10T08:00:00", j.GetProperty("dataCriacao").GetString());
        Assert.StartsWith("2024-01-10T08:00:05", j.GetProperty("dataEnvio").GetString());
    }
}
