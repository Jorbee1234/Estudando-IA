namespace api_notificacoes.DTOs;

// Chamado pela api-frotas (POST /api/notificacoes/alerta-manutencao). DataBase no formato yyyy-MM-dd.
public class AlertaManutencaoRequest
{
    public long VeiculoId { get; set; }
    public string Placa { get; set; } = string.Empty;
    public string? Modelo { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public long KmAtual { get; set; }
    public long? KmBase { get; set; }
    public string? DataBase { get; set; }
    public string? ReferenciaId { get; set; }
}

// Status: "ENVIADO" ou "FALHA" (o envio é síncrono, nunca devolve PENDENTE)
public class AlertaManutencaoResponse
{
    public long NotificacaoId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Erro { get; set; }
}
