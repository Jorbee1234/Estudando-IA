namespace api_notificacoes.Configuration;

// Limite por IP de origem para POST /api/notificacoes e POST /api/notificacoes/{id}/reenviar
public class RateLimitOptions
{
    public const string Secao = "RateLimit";
    public const string PoliticaEscrita = "escrita";

    public int Limite { get; set; } = 60;
    public int JanelaSegundos { get; set; } = 60;
}
