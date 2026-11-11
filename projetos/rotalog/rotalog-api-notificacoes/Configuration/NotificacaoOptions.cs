namespace api_notificacoes.Configuration;

public class NotificacaoOptions
{
    public const string Secao = "Notificacao";

    // Tamanho do lote de /processar (era 50 fixo no código)
    public int TamanhoLote { get; set; } = 50;

    // Destinatário dos alertas de manutenção preventiva (POST /api/notificacoes/alerta-manutencao)
    public string EmailGestor { get; set; } = "gestor@rotalog.com";
}
