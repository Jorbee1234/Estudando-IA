namespace api_notificacoes.Models;

// Mapeamento em Data/Configurations/TemplateNotificacaoConfiguration.cs
public class TemplateNotificacao
{
    public long Id { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Canal { get; set; } = "email";
    public string? AssuntoTemplate { get; set; }
    public string CorpoTemplate { get; set; } = string.Empty;
    public bool Ativo { get; set; } = true;
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
    public DateTime DataAtualizacao { get; set; } = DateTime.UtcNow;
}
