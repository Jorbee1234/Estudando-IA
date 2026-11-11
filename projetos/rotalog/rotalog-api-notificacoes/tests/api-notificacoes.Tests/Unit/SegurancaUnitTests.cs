using System.Text.Json;
using api_notificacoes.Configuration;
using api_notificacoes.DTOs;
using api_notificacoes.Logging;
using api_notificacoes.Tests.Infra;
using api_notificacoes.Validators;

namespace api_notificacoes.Tests.Unit;

public class MascaraTests
{
    [Theory]
    [InlineData("maria@dominio.com", "m***@dominio.com")]
    [InlineData("a@b.co", "a***@b.co")]
    [InlineData("+5511999991234", "***1234")]
    [InlineData("11999991234", "***1234")]
    [InlineData("123", "***")]
    [InlineData("", "")]
    [InlineData(null, "")]
    public void Mascara_destinatario(string? entrada, string esperado)
    {
        Assert.Equal(esperado, Mascara.Destinatario(entrada));
    }

    [Fact]
    public void Mascara_nunca_devolve_o_valor_original_quando_ha_algo_a_esconder()
    {
        foreach (var d in new[] { "maria@dominio.com", "+5511999991234", "abcdef" })
            Assert.NotEqual(d, Mascara.Destinatario(d));
    }
}

public class FormatoDestinatarioTests
{
    [Theory]
    [InlineData("email", "a@b.com", true)]
    [InlineData(null, "a@b.com", true)]
    [InlineData("email", "a@b", false)]
    [InlineData("email", "a b@c.com", false)]
    [InlineData("email", "+5511999990001", false)]
    [InlineData("sms", "+5511999990001", true)]
    [InlineData("sms", "5511999990001", true)]
    [InlineData("sms", "12345", false)]
    [InlineData("sms", "+55 11 99999-0001", false)]
    [InlineData("sms", "a@b.com", false)]
    [InlineData("email", "", false)]
    [InlineData("email", null, false)]
    public void Valido(string? canal, string? destinatario, bool esperado)
    {
        Assert.Equal(esperado, FormatoDestinatario.Valido(canal, destinatario));
    }
}

public class ReenvioRequestValidatorTests
{
    private static readonly ReenvioRequestValidator V = new();

    private static string? Erro(ReenvioRequest r)
    {
        var res = V.Validate(r);
        return res.IsValid ? null : res.Errors[0].ErrorMessage;
    }

    [Fact]
    public void Vazio_e_valido()
    {
        Assert.Null(Erro(new ReenvioRequest()));
    }

    [Fact]
    public void Canal_deve_ser_email_ou_sms()
    {
        Assert.Null(Erro(new ReenvioRequest { NovoCanal = "sms" }));
        Assert.Equal("Campo 'novoCanal' deve ser 'email' ou 'sms'", Erro(new ReenvioRequest { NovoCanal = "pombo" }));
    }

    [Fact]
    public void Destinatario_nao_pode_ser_vazio_nem_passar_de_255()
    {
        Assert.Equal("Campo 'novoDestinatario' não pode ser vazio", Erro(new ReenvioRequest { NovoDestinatario = " " }));
        Assert.Equal("Campo 'novoDestinatario' deve ter no máximo 255 caracteres",
            Erro(new ReenvioRequest { NovoDestinatario = new string('a', 256) }));
    }

    [Fact]
    public void Formato_so_e_checado_aqui_quando_o_canal_vem_junto()
    {
        Assert.Null(Erro(new ReenvioRequest { NovoDestinatario = "qualquer-coisa" })); // o serviço checa contra o canal atual
        Assert.NotNull(Erro(new ReenvioRequest { NovoCanal = "sms", NovoDestinatario = "a@b.com" }));
        Assert.Null(Erro(new ReenvioRequest { NovoCanal = "sms", NovoDestinatario = "+5511999990001" }));
    }
}

public class CorsOptionsTests
{
    [Fact]
    public void Padrao_sao_os_dois_frontends_locais()
    {
        Assert.Equal(new[] { "http://localhost:4200", "http://localhost:3001" }, new CorsOptions().OrigensEfetivas());
    }

    [Fact]
    public void Configuracao_substitui_o_padrao()
    {
        Assert.Equal(new[] { "https://x.exemplo" }, new CorsOptions { Origens = new[] { "https://x.exemplo" } }.OrigensEfetivas());
        Assert.Equal(2, new CorsOptions { Origens = Array.Empty<string>() }.OrigensEfetivas().Length);
    }
}

/// <summary>Segredos fora do código versionado (ADR 0001, D3).</summary>
public class SegredosTests
{
    private static string Raiz() => BancoDeTeste.LocalizarProjetoApi();

    [Fact]
    public void Exemplo_de_configuracao_nao_traz_credenciais_nem_aceita_qualquer_host()
    {
        using var doc = JsonDocument.Parse(File.ReadAllText(Path.Combine(Raiz(), "appsettings.Example.json")));
        var raiz = doc.RootElement;

        Assert.Equal("", raiz.GetProperty("EmailSettings").GetProperty("SenderPassword").GetString());
        Assert.Equal("", raiz.GetProperty("SmsSettings").GetProperty("ApiKey").GetString());
        Assert.Contains("<defina-via-variavel-de-ambiente>", raiz.GetProperty("ConnectionStrings").GetProperty("DefaultConnection").GetString());
        Assert.NotEqual("*", raiz.GetProperty("AllowedHosts").GetString());
    }

    [Fact]
    public void Gitignore_cobre_appsettings_e_env_exceto_o_exemplo()
    {
        var linhas = File.ReadAllLines(Path.Combine(Raiz(), ".gitignore")).Select(l => l.Trim()).ToList();

        Assert.Contains("appsettings.json", linhas);
        Assert.Contains("appsettings.*.json", linhas);
        Assert.Contains("!appsettings.Example.json", linhas);
        Assert.Contains(".env", linhas);
    }
}
