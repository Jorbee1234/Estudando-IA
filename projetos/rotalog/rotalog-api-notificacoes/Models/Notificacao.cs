using api_notificacoes.Domain;

namespace api_notificacoes.Models;

// Mapeamento em Data/Configurations/NotificacaoConfiguration.cs
public class Notificacao
{
    public long Id { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Canal { get; set; } = CanalNotificacao.Email;
    public string Destinatario { get; set; } = string.Empty;
    public string? Assunto { get; set; }
    public string Mensagem { get; set; } = string.Empty;
    public StatusNotificacao Status { get; set; } = StatusNotificacao.Pendente;
    public int Tentativas { get; set; } = 0;
    public int MaxTentativas { get; set; } = 3;
    public string? ErroMensagem { get; set; }
    public string? ServicoOrigem { get; set; }
    public string? ReferenciaId { get; set; }
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
    public DateTime? DataEnvio { get; set; }
    public DateTime DataAtualizacao { get; set; } = DateTime.UtcNow;
}
