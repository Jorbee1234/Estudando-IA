namespace api_notificacoes.Models;

// Tabela mapeada, mas a lógica de preferências nunca foi implementada (ADR 0001, seção 2)
// Mapeamento em Data/Configurations/ConfiguracaoNotificacaoConfiguration.cs
public class ConfiguracaoNotificacao
{
    public long Id { get; set; }
    public string Destinatario { get; set; } = string.Empty;
    public string CanalPreferido { get; set; } = "email";
    public bool Ativo { get; set; } = true;
    public bool ReceberEmail { get; set; } = true;
    public bool ReceberSms { get; set; } = false;
    public bool ReceberPush { get; set; } = false;
    public TimeOnly? HorarioSilenciosoInicio { get; set; }
    public TimeOnly? HorarioSilenciosoFim { get; set; }
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
}
