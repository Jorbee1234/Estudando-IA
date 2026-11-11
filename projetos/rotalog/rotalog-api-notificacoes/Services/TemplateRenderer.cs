using api_notificacoes.Data;
using api_notificacoes.Domain;
using Microsoft.EntityFrameworkCore;

namespace api_notificacoes.Services;

// Assunto é null quando o template não define assunto (vale o assunto do request)
public record TemplateRenderizado(string Mensagem, string? Assunto);

public interface ITemplateRenderer
{
    // Null quando não há template ativo para (tipo, canal)
    Task<TemplateRenderizado?> RenderizarAsync(string tipo, string canal, IReadOnlyDictionary<string, string> variaveis);
}

// Substituição simples de {{chave}}. No canal email os valores das variáveis têm o HTML escapado no corpo
// (ADR 0001, D3). Variável ausente continua deixando o placeholder no texto: validar isso muda o contrato.
// O assunto é cabeçalho de texto puro, por isso não é escapado.
public class TemplateRenderer : ITemplateRenderer
{
    private readonly NotificacoesDbContext _context;

    public TemplateRenderer(NotificacoesDbContext context)
    {
        _context = context;
    }

    public async Task<TemplateRenderizado?> RenderizarAsync(
        string tipo, string canal, IReadOnlyDictionary<string, string> variaveis)
    {
        var template = await _context.Templates
            .FirstOrDefaultAsync(t => t.Tipo == tipo && t.Canal == canal && t.Ativo);

        if (template == null)
            return null;

        var assunto = string.IsNullOrEmpty(template.AssuntoTemplate)
            ? null
            : Aplicar(template.AssuntoTemplate, variaveis, escapar: false);

        var corpo = Aplicar(template.CorpoTemplate, variaveis, escapar: canal == CanalNotificacao.Email);
        return new TemplateRenderizado(corpo, assunto);
    }

    // Só os cinco caracteres que importam; HtmlEncoder.Default também reescreveria acentos e "+"
    private static string EscaparHtml(string? valor) => (valor ?? string.Empty)
        .Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")
        .Replace("\"", "&quot;").Replace("'", "&#39;");

    private static string Aplicar(string template, IReadOnlyDictionary<string, string> variaveis, bool escapar)
    {
        var resultado = template;
        foreach (var (chave, valor) in variaveis)
            resultado = resultado.Replace("{{" + chave + "}}", escapar ? EscaparHtml(valor) : valor);
        return resultado;
    }
}
