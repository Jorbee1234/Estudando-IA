using api_notificacoes.Data;
using api_notificacoes.Domain;
using api_notificacoes.DTOs;
using api_notificacoes.Mapping;
using api_notificacoes.Models;
using api_notificacoes.Validators;
using Microsoft.EntityFrameworkCore;

namespace api_notificacoes.Tests.Unit;

public class StatusNotificacaoTextoTests
{
    [Theory]
    [InlineData(StatusNotificacao.Pendente, "PENDENTE")]
    [InlineData(StatusNotificacao.Enviado, "ENVIADO")]
    [InlineData(StatusNotificacao.Falha, "FALHA")]
    public void Ida_e_volta_com_o_texto_do_banco(StatusNotificacao status, string texto)
    {
        Assert.Equal(texto, status.ParaTexto());
        Assert.Equal(status, StatusNotificacaoTexto.Ler(texto));
    }

    [Theory]
    [InlineData("pendente", true)]
    [InlineData("Enviado", true)]
    [InlineData("FALHA", true)]
    [InlineData("0", false)]
    [InlineData("1", false)]
    [InlineData("xyz", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void TentarLer_ignora_caixa_e_recusa_numeros_e_desconhecidos(string? texto, bool esperado)
    {
        Assert.Equal(esperado, StatusNotificacaoTexto.TentarLer(texto, out _));
    }

    [Fact]
    public void Ler_texto_desconhecido_do_banco_falha_em_voz_alta()
    {
        Assert.Throws<InvalidOperationException>(() => StatusNotificacaoTexto.Ler("OUTRO"));
    }
}

public class NotificacaoMapperTests
{
    [Fact]
    public void Mapeia_todos_os_campos_e_o_status_vira_texto()
    {
        var criada = new DateTime(2024, 1, 2, 3, 4, 5, DateTimeKind.Utc);
        var n = new Notificacao
        {
            Id = 7, Tipo = "T", Canal = "sms", Destinatario = "d", Assunto = "a", Mensagem = "m",
            Status = StatusNotificacao.Falha, Tentativas = 3, MaxTentativas = 3, ErroMensagem = "e",
            ServicoOrigem = "api-frotas", ReferenciaId = "r", DataCriacao = criada, DataEnvio = criada.AddMinutes(1)
        };

        var r = NotificacaoMapper.ParaResponse(n);

        Assert.Equal(7, r.Id);
        Assert.Equal("T", r.Tipo);
        Assert.Equal("sms", r.Canal);
        Assert.Equal("d", r.Destinatario);
        Assert.Equal("a", r.Assunto);
        Assert.Equal("m", r.Mensagem);
        Assert.Equal("FALHA", r.Status);
        Assert.Equal(3, r.Tentativas);
        Assert.Equal("e", r.ErroMensagem);
        Assert.Equal("api-frotas", r.ServicoOrigem);
        Assert.Equal("r", r.ReferenciaId);
        Assert.Equal(criada, r.DataCriacao);
        Assert.Equal(criada.AddMinutes(1), r.DataEnvio);
    }
}

public class NotificacaoRequestValidatorTests
{
    private static readonly NotificacaoRequestValidator V = new();

    private static string? Erro(NotificacaoRequest r)
    {
        var res = V.Validate(r);
        return res.IsValid ? null : res.Errors[0].ErrorMessage;
    }

    [Fact]
    public void Valido_com_mensagem()
    {
        Assert.Null(Erro(new NotificacaoRequest { Tipo = "T", Destinatario = "d@x.com", Mensagem = "m" }));
    }

    [Fact]
    public void Valido_com_variaveis_e_sem_mensagem()
    {
        Assert.Null(Erro(new NotificacaoRequest
        {
            Tipo = "T", Destinatario = "d@x.com", Variaveis = new() { ["x"] = "1" }
        }));
    }

    [Fact]
    public void Tipo_ausente()
    {
        Assert.Equal("Campo 'tipo' é obrigatório",
            Erro(new NotificacaoRequest { Destinatario = "d@x.com", Mensagem = "m" }));
    }

    [Fact]
    public void Destinatario_ausente()
    {
        Assert.Equal("Campo 'destinatario' é obrigatório",
            Erro(new NotificacaoRequest { Tipo = "T", Mensagem = "m" }));
    }

    [Fact]
    public void Sem_mensagem_nem_variaveis_ou_variaveis_vazias()
    {
        const string esperado = "Campo 'mensagem' ou 'variaveis' é obrigatório";
        Assert.Equal(esperado, Erro(new NotificacaoRequest { Tipo = "T", Destinatario = "d@x.com" }));
        Assert.Equal(esperado, Erro(new NotificacaoRequest { Tipo = "T", Destinatario = "d@x.com", Variaveis = new() }));
    }

    [Fact]
    public void O_primeiro_erro_segue_a_ordem_tipo_destinatario_mensagem()
    {
        Assert.Equal("Campo 'tipo' é obrigatório", Erro(new NotificacaoRequest()));
    }

    [Fact]
    public void Espacos_em_branco_contam_como_vazio()
    {
        Assert.Equal("Campo 'tipo' é obrigatório", Erro(new NotificacaoRequest { Tipo = " ", Destinatario = "d@x.com", Mensagem = "m" }));
        Assert.Equal("Campo 'mensagem' ou 'variaveis' é obrigatório", Erro(new NotificacaoRequest { Tipo = "T", Destinatario = "d@x.com", Mensagem = "  " }));
    }
}

public class ModeloEfTests
{
    private static NotificacoesDbContext Ctx() =>
        new(new DbContextOptionsBuilder<NotificacoesDbContext>().UseNpgsql("Host=x;Database=x").Options);

    [Fact]
    public void Tabelas_no_schema_notificacoes_com_nomes_do_SQL()
    {
        using var ctx = Ctx();
        var tabelas = ctx.Model.GetEntityTypes()
            .Select(e => $"{e.GetSchema() ?? ctx.Model.GetDefaultSchema()}.{e.GetTableName()}")
            .OrderBy(x => x, StringComparer.Ordinal).ToArray();

        Assert.Equal(new[]
        {
            "notificacoes.configuracoes_notificacao", "notificacoes.notificacoes", "notificacoes.templates_notificacao"
        }, tabelas);
    }

    [Fact]
    public void Indices_tem_os_mesmos_nomes_do_04_migration()
    {
        using var ctx = Ctx();
        var nomes = ctx.Model.GetEntityTypes().SelectMany(e => e.GetIndexes())
            .Select(i => i.GetDatabaseName()).OrderBy(x => x, StringComparer.Ordinal).ToArray();

        Assert.Equal(new[]
        {
            "idx_notificacoes_data_criacao", "idx_notificacoes_destinatario", "idx_notificacoes_status",
            "idx_notificacoes_tipo", "idx_templates_tipo_canal"
        }, nomes);
    }

    [Fact]
    public void Indice_de_template_nao_e_unico_como_no_SQL()
    {
        using var ctx = Ctx();
        var indice = ctx.Model.FindEntityType(typeof(TemplateNotificacao))!.GetIndexes().Single();
        Assert.False(indice.IsUnique);
    }

    [Fact]
    public void Status_fica_como_varchar_20_no_banco()
    {
        using var ctx = Ctx();
        var p = ctx.Model.FindEntityType(typeof(Notificacao))!.FindProperty(nameof(Notificacao.Status))!;
        Assert.Equal("status", p.GetColumnName());
        Assert.Equal(20, p.GetMaxLength());
        Assert.Equal("character varying(20)", p.GetColumnType());
    }

    [Fact]
    public void Entidades_nao_usam_mais_atributos_de_mapeamento()
    {
        foreach (var tipo in new[] { typeof(Notificacao), typeof(TemplateNotificacao), typeof(ConfiguracaoNotificacao) })
        {
            Assert.Empty(tipo.GetCustomAttributes(typeof(System.ComponentModel.DataAnnotations.Schema.TableAttribute), false));
            Assert.All(tipo.GetProperties(), p =>
                Assert.Empty(p.GetCustomAttributes(typeof(System.ComponentModel.DataAnnotations.Schema.ColumnAttribute), false)));
        }
    }
}
