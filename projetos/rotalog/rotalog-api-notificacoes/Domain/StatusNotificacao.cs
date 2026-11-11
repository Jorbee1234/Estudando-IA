namespace api_notificacoes.Domain;

public enum StatusNotificacao
{
    Pendente,
    Enviado,
    Falha
}

// O banco guarda texto em maiúsculas ("PENDENTE", "ENVIADO", "FALHA"); nenhum SQL muda (ADR 0001, D1)
public static class StatusNotificacaoTexto
{
    public static string ParaTexto(this StatusNotificacao status) => status switch
    {
        StatusNotificacao.Pendente => "PENDENTE",
        StatusNotificacao.Enviado => "ENVIADO",
        StatusNotificacao.Falha => "FALHA",
        _ => throw new ArgumentOutOfRangeException(nameof(status), status, null)
    };

    // Ignora a caixa, como o filtro de status sempre fez (ToUpper). Números e valores desconhecidos não casam.
    public static bool TentarLer(string? texto, out StatusNotificacao status)
    {
        switch (texto?.ToUpperInvariant())
        {
            case "PENDENTE": status = StatusNotificacao.Pendente; return true;
            case "ENVIADO": status = StatusNotificacao.Enviado; return true;
            case "FALHA": status = StatusNotificacao.Falha; return true;
            default: status = default; return false;
        }
    }

    public static StatusNotificacao Ler(string texto) =>
        TentarLer(texto, out var status)
            ? status
            : throw new InvalidOperationException($"Status desconhecido no banco: '{texto}'");
}
