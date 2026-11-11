namespace api_notificacoes.Logging;

// Dados pessoais não vão inteiros para o log (ADR 0001, D3)
public static class Mascara
{
    // a***@dominio.com  |  ***1234
    public static string Destinatario(string? destinatario)
    {
        if (string.IsNullOrEmpty(destinatario))
            return string.Empty;

        var arroba = destinatario.IndexOf('@');
        if (arroba > 0)
            return destinatario[0] + "***" + destinatario[arroba..];

        return destinatario.Length <= 4 ? "***" : "***" + destinatario[^4..];
    }
}
