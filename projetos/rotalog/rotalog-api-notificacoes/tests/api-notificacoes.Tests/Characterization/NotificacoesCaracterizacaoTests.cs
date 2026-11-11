using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using api_notificacoes.Tests.Infra;

namespace api_notificacoes.Tests.Characterization;

/// <summary>
/// Fixa o comportamento ATUAL (inclusive o "errado") antes de refatorar. ADR 0001, D6.
/// O envio é fake com falha aleatória (10% e-mail, 20% SMS): os testes só afirmam o que vale nos dois casos.
/// Seed (07): 10 notificações (8 ENVIADO, 1 FALHA id 8, 1 PENDENTE sms id 10) e 10 templates.
/// </summary>
public class NotificacoesCaracterizacaoTests : TesteDeApi
{
    public NotificacoesCaracterizacaoTests(ApiFactory f) : base(f) { }

    private static readonly string[] StatusPosEnvio = { "ENVIADO", "PENDENTE", "FALHA" };

    private static async Task<JsonElement> Json(HttpResponseMessage r) =>
        await r.Content.ReadFromJsonAsync<JsonElement>();

    private static StringContent Corpo(string json) => new(json, Encoding.UTF8, "application/json");

    // ---------- POST /api/notificacoes ----------

    [Fact]
    public async Task Criar_com_sucesso_devolve_201_e_Location()
    {
        var r = await Http.PostAsJsonAsync("/api/notificacoes", new
        {
            tipo = "TESTE", destinatario = "a@b.com", mensagem = "oi", canal = "email",
            servicoOrigem = "api-frotas", referenciaId = "x-1"
        });

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var j = await Json(r);
        var id = j.GetProperty("id").GetInt64();
        Assert.EndsWith($"/api/Notificacoes/{id}", r.Headers.Location!.AbsolutePath, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("TESTE", j.GetProperty("tipo").GetString());
        Assert.Equal("email", j.GetProperty("canal").GetString());
        // o envio sai da requisição: a resposta é a notificação aceita, ainda sem tentativa
        Assert.Equal(0, j.GetProperty("tentativas").GetInt32());
        Assert.Equal("PENDENTE", j.GetProperty("status").GetString());

        await Espera.NotificacaoTentadaAsync(id);
        var depois = await Json(await Http.GetAsync($"/api/notificacoes/{id}"));
        Assert.Equal(1, depois.GetProperty("tentativas").GetInt32());
        Assert.Contains(depois.GetProperty("status").GetString(), StatusPosEnvio);
    }

    [Fact]
    public async Task Criar_sem_canal_assume_email()
    {
        var r = await Http.PostAsJsonAsync("/api/notificacoes", new { tipo = "T", destinatario = "a@b.com", mensagem = "m" });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        Assert.Equal("email", (await Json(r)).GetProperty("canal").GetString());
    }

    [Theory]
    [InlineData("{\"destinatario\":\"a@b.com\",\"mensagem\":\"m\"}", "Campo 'tipo' é obrigatório")]
    [InlineData("{\"tipo\":\"T\",\"mensagem\":\"m\"}", "Campo 'destinatario' é obrigatório")]
    [InlineData("{\"tipo\":\"T\",\"destinatario\":\"a@b.com\"}", "Campo 'mensagem' ou 'variaveis' é obrigatório")]
    public async Task Criar_sem_campo_obrigatorio_devolve_400_com_error(string corpo, string erro)
    {
        var r = await Http.PostAsync("/api/notificacoes", Corpo(corpo));
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Equal(erro, (await Json(r)).GetProperty("error").GetString());
    }

    [Fact]
    public async Task Criar_com_canal_invalido_devolve_400()
    {
        var r = await Http.PostAsJsonAsync("/api/notificacoes", new { tipo = "T", destinatario = "a@b.com", mensagem = "m", canal = "pombo" });

        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Equal("Campo 'canal' deve ser 'email' ou 'sms'", (await Json(r)).GetProperty("error").GetString());
    }

    [Fact]
    public async Task Criar_com_variaveis_e_template_ativo_aplica_template()
    {
        var r = await Http.PostAsJsonAsync("/api/notificacoes", new
        {
            tipo = "VEICULO_CADASTRADO", destinatario = "a@b.com", mensagem = "ignorada", canal = "email",
            variaveis = new Dictionary<string, string> { ["placa"] = "ABC1D23", ["modelo"] = "Fiorino", ["ano"] = "2020" }
        });

        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
        var j = await Json(r);
        Assert.Equal("Novo veículo cadastrado: ABC1D23", j.GetProperty("assunto").GetString());
        Assert.Contains("Placa: ABC1D23", j.GetProperty("mensagem").GetString());
    }

    [Fact]
    public async Task Criar_com_variavel_ausente_deixa_o_placeholder_no_texto()
    {
        var r = await Http.PostAsJsonAsync("/api/notificacoes", new
        {
            tipo = "VEICULO_CADASTRADO", destinatario = "a@b.com", canal = "email",
            variaveis = new Dictionary<string, string> { ["placa"] = "ABC1D23" }
        });

        Assert.Contains("{{modelo}}", (await Json(r)).GetProperty("mensagem").GetString());
    }

    [Fact]
    public async Task Criar_com_template_inexistente_usa_a_mensagem_do_request()
    {
        var r = await Http.PostAsJsonAsync("/api/notificacoes", new
        {
            tipo = "SEM_TEMPLATE", destinatario = "a@b.com", mensagem = "texto original",
            variaveis = new Dictionary<string, string> { ["x"] = "1" }
        });

        Assert.Equal("texto original", (await Json(r)).GetProperty("mensagem").GetString());
    }

    [Fact]
    public async Task Criar_escapa_HTML_das_variaveis_no_corpo_do_email()
    {
        var r = await Http.PostAsJsonAsync("/api/notificacoes", new
        {
            tipo = "VEICULO_CADASTRADO", destinatario = "a@b.com", canal = "email",
            variaveis = new Dictionary<string, string> { ["placa"] = "<script>alert(1)</script>", ["modelo"] = "m", ["ano"] = "1" }
        });

        var mensagem = (await Json(r)).GetProperty("mensagem").GetString()!;
        Assert.Contains("&lt;script&gt;alert(1)&lt;/script&gt;", mensagem);
        Assert.DoesNotContain("<script>", mensagem);
    }

    [Fact]
    public async Task Criar_sem_autenticacao_e_aceito()
    {
        // Não há esquema de autenticação: nenhum cabeçalho é exigido (ADR 0001, seção 3).
        Assert.Null(Http.DefaultRequestHeaders.Authorization);
        var r = await Http.PostAsJsonAsync("/api/notificacoes", new { tipo = "T", destinatario = "a@b.com", mensagem = "m" });
        Assert.Equal(HttpStatusCode.Created, r.StatusCode);
    }

    [Fact]
    public async Task Criar_com_json_malformado_devolve_400()
    {
        var r = await Http.PostAsync("/api/notificacoes", Corpo("{ nao eh json"));
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
    }

    // ---------- GET ----------

    [Fact]
    public async Task Listar_devolve_o_seed_ordenado_por_DataCriacao_decrescente()
    {
        var r = await Http.GetAsync("/api/notificacoes");
        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var lista = (await Json(r)).EnumerateArray().ToList();
        Assert.Equal(10, lista.Count);

        var datas = lista.Select(n => n.GetProperty("dataCriacao").GetDateTime()).ToList();
        Assert.Equal(datas.OrderByDescending(d => d), datas);
    }

    [Fact]
    public async Task Listar_filtra_status_e_canal_ignorando_caixa()
    {
        // status é normalizado com ToUpper() e canal com ToLower() só nos filtros
        var falha = (await Json(await Http.GetAsync("/api/notificacoes?status=falha"))).EnumerateArray().ToList();
        Assert.Single(falha);
        Assert.Equal("FALHA", falha[0].GetProperty("status").GetString());

        var sms = (await Json(await Http.GetAsync("/api/notificacoes?canal=SMS"))).EnumerateArray().ToList();
        Assert.Single(sms);
        Assert.Equal("sms", sms[0].GetProperty("canal").GetString());
    }

    [Fact]
    public async Task Listar_filtra_por_tipo_e_servicoOrigem_com_comparacao_exata()
    {
        var tipo = (await Json(await Http.GetAsync("/api/notificacoes?tipo=ENTREGA_CRIADA"))).EnumerateArray().ToList();
        Assert.Equal(2, tipo.Count);

        var origem = (await Json(await Http.GetAsync("/api/notificacoes?servicoOrigem=api-frotas"))).EnumerateArray().ToList();
        Assert.Equal(5, origem.Count);

        var minusculo = (await Json(await Http.GetAsync("/api/notificacoes?tipo=entrega_criada"))).EnumerateArray().ToList();
        Assert.Empty(minusculo); // tipo NÃO é normalizado
    }

    [Fact]
    public async Task BuscarPorId_encontrado_404_e_id_nao_numerico()
    {
        var ok = await Http.GetAsync("/api/notificacoes/1");
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        Assert.Equal(1, (await Json(ok)).GetProperty("id").GetInt64());

        var nao = await Http.GetAsync("/api/notificacoes/99999");
        Assert.Equal(HttpStatusCode.NotFound, nao.StatusCode);
        Assert.Equal("Notificação não encontrada", (await Json(nao)).GetProperty("error").GetString());

        var texto = await Http.GetAsync("/api/notificacoes/abc");
        Assert.Equal(HttpStatusCode.BadRequest, texto.StatusCode);
    }

    [Fact]
    public async Task Resposta_usa_camelCase_e_nao_expoe_MaxTentativas_nem_DataAtualizacao()
    {
        var j = await Json(await Http.GetAsync("/api/notificacoes/1"));
        var campos = j.EnumerateObject().Select(p => p.Name).OrderBy(x => x, StringComparer.Ordinal).ToArray();
        Assert.Equal(new[]
        {
            "assunto", "canal", "dataCriacao", "dataEnvio", "destinatario", "erroMensagem", "id", "mensagem",
            "referenciaId", "servicoOrigem", "status", "tentativas", "tipo"
        }, campos);
    }

    [Fact]
    public async Task Stats_conta_por_status_tipo_e_canal()
    {
        var j = await Json(await Http.GetAsync("/api/notificacoes/stats"));
        Assert.Equal(10, j.GetProperty("total").GetInt32());
        Assert.Equal(8, j.GetProperty("enviadas").GetInt32());
        Assert.Equal(1, j.GetProperty("pendentes").GetInt32());
        Assert.Equal(1, j.GetProperty("falhas").GetInt32());
        Assert.Equal(2, j.GetProperty("porTipo").GetProperty("ENTREGA_CRIADA").GetInt32());
        Assert.Equal(9, j.GetProperty("porCanal").GetProperty("email").GetInt32());
        Assert.Equal(1, j.GetProperty("porCanal").GetProperty("sms").GetInt32());
        Assert.True(j.TryGetProperty("geradoEm", out _));
    }

    [Fact]
    public async Task Templates_apenasAtivos_filtra_e_ordena_por_tipo_e_canal()
    {
        BancoDeTeste.Executar("UPDATE notificacoes.templates_notificacao SET ativo = false WHERE tipo = 'CNH_VENCIDA'");

        var todos = (await Json(await Http.GetAsync("/api/notificacoes/templates"))).EnumerateArray().ToList();
        var ativos = (await Json(await Http.GetAsync("/api/notificacoes/templates?apenasAtivos=true"))).EnumerateArray().ToList();

        Assert.Equal(11, todos.Count); // 10 originais + MANUTENCAO_PREVENTIVA (alerta de manutenção)
        Assert.Equal(10, ativos.Count);
        var chaves = todos.Select(t => (Tipo: t.GetProperty("tipo").GetString()!, Canal: t.GetProperty("canal").GetString()!)).ToList();
        Assert.Equal(chaves.OrderBy(c => c.Tipo, StringComparer.Ordinal).ThenBy(c => c.Canal, StringComparer.Ordinal), chaves);
    }

    // ---------- Reenviar ----------

    [Fact]
    public async Task Reenviar_inexistente_devolve_404()
    {
        var r = await Http.PostAsJsonAsync("/api/notificacoes/99999/reenviar", new { });
        Assert.Equal(HttpStatusCode.NotFound, r.StatusCode);
    }

    [Fact]
    public async Task Reenviar_notificacao_ja_ENVIADA_e_permitido_e_soma_tentativa()
    {
        // id 1 do seed: ENVIADO, tentativas = 1
        var r = await Http.PostAsJsonAsync("/api/notificacoes/1/reenviar", new { });

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await Json(r);
        // resposta imediata: voltou a PENDENTE, tentativas mantidas; a nova tentativa acontece em segundo plano
        Assert.Equal("PENDENTE", j.GetProperty("status").GetString());
        Assert.Equal(1, j.GetProperty("tentativas").GetInt32());

        await Espera.NotificacaoTentadaAsync(1, 2);
        var depois = await Json(await Http.GetAsync("/api/notificacoes/1"));
        Assert.Equal(2, depois.GetProperty("tentativas").GetInt32());
        Assert.Contains(depois.GetProperty("status").GetString(), StatusPosEnvio);
    }

    [Fact]
    public async Task Reenviar_nao_respeita_MaxTentativas()
    {
        // id 8 do seed: FALHA com 3/3 tentativas
        var j = await Json(await Http.PostAsJsonAsync("/api/notificacoes/8/reenviar", new { }));
        Assert.Equal(3, j.GetProperty("tentativas").GetInt32());

        await Espera.NotificacaoTentadaAsync(8, 4); // a tentativa extra acontece mesmo com 3/3
    }

    [Fact]
    public async Task Reenviar_com_NovoCanal_invalido_devolve_400()
    {
        var r = await Http.PostAsJsonAsync("/api/notificacoes/1/reenviar", new { novoCanal = "pombo" });
        Assert.Equal(HttpStatusCode.BadRequest, r.StatusCode);
        Assert.Equal("Campo 'novoCanal' deve ser 'email' ou 'sms'", (await Json(r)).GetProperty("error").GetString());
    }

    // ---------- Processar ----------

    [Fact]
    public async Task Processar_sem_autenticacao_processa_pendentes_e_devolve_contagem()
    {
        // seed: 1 PENDENTE (id 10) com 0/3 tentativas
        var r = await Http.PostAsync("/api/notificacoes/processar", null);

        Assert.Equal(HttpStatusCode.OK, r.StatusCode);
        var j = await Json(r);
        Assert.Equal(1, j.GetProperty("processadas").GetInt32());
        Assert.True(j.TryGetProperty("timestamp", out _));
        Assert.Equal(1, BancoDeTeste.Escalar<int>("SELECT tentativas FROM notificacoes.notificacoes WHERE id = 10"));
    }

    [Fact]
    public async Task Processar_ignora_pendentes_que_atingiram_MaxTentativas()
    {
        BancoDeTeste.Executar("UPDATE notificacoes.notificacoes SET tentativas = max_tentativas WHERE id = 10");
        var j = await Json(await Http.PostAsync("/api/notificacoes/processar", null));
        Assert.Equal(0, j.GetProperty("processadas").GetInt32());
    }

    [Fact]
    public async Task Processar_na_ultima_tentativa_sai_de_PENDENTE()
    {
        BancoDeTeste.Executar("UPDATE notificacoes.notificacoes SET tentativas = max_tentativas - 1 WHERE id = 10");
        await Http.PostAsync("/api/notificacoes/processar", null);
        var status = BancoDeTeste.Escalar<string>("SELECT status FROM notificacoes.notificacoes WHERE id = 10");
        Assert.Contains(status, new[] { "ENVIADO", "FALHA" });
    }

    [Fact]
    public async Task Processar_respeita_o_lote_fixo_de_50()
    {
        BancoDeTeste.Executar(@"INSERT INTO notificacoes.notificacoes (tipo, canal, destinatario, mensagem, status, tentativas, max_tentativas)
            SELECT 'LOTE', 'email', 'l@b.com', 'm', 'PENDENTE', 2, 3 FROM generate_series(1, 60)");

        var j = await Json(await Http.PostAsync("/api/notificacoes/processar", null));
        Assert.Equal(50, j.GetProperty("processadas").GetInt32());
    }

    // ---------- Rotas, Swagger e CORS ----------

    [Fact]
    public async Task Rota_inexistente_devolve_404()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await Http.GetAsync("/api/nao-existe")).StatusCode);
    }

    [Fact]
    public async Task Rotas_citadas_no_README_mas_inexistentes_nao_respondem()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await Http.GetAsync("/health")).StatusCode);
        // POST /email e /sms casam com a rota {id} (GET) e respondem 405, não 404
        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await Http.PostAsync("/api/notificacoes/email", Corpo("{}"))).StatusCode);
        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await Http.PostAsync("/api/notificacoes/sms", Corpo("{}"))).StatusCode);
    }

    [Fact]
    public async Task Swagger_esta_disponivel_hoje_em_qualquer_ambiente()
    {
        // O ambiente do WebApplicationFactory é Development; a ADR D3 restringirá a Development.
        Assert.Equal(HttpStatusCode.OK, (await Http.GetAsync("/swagger/v1/swagger.json")).StatusCode);
    }

    [Fact]
    public async Task Cors_so_permite_as_origens_configuradas_os_frontends_locais_por_padrao()
    {
        foreach (var origem in new[] { "http://localhost:4200", "http://localhost:3001" })
        {
            var req = new HttpRequestMessage(HttpMethod.Get, "/api/notificacoes/stats");
            req.Headers.Add("Origin", origem);
            var r = await Http.SendAsync(req);
            Assert.Equal(origem, r.Headers.GetValues("Access-Control-Allow-Origin").Single());
        }

        var estranha = new HttpRequestMessage(HttpMethod.Get, "/api/notificacoes/stats");
        estranha.Headers.Add("Origin", "http://qualquer.exemplo");
        Assert.False((await Http.SendAsync(estranha)).Headers.Contains("Access-Control-Allow-Origin"));
    }
}
