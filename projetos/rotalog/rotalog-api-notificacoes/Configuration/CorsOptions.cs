namespace api_notificacoes.Configuration;

public class CorsOptions
{
    public const string Secao = "Cors";

    // Sem valor padrão na propriedade: o binder de arrays soma itens à lista existente
    public string[]? Origens { get; set; }

    // Padrão: os dois frontends locais (painel-admin :4200 e rastreamento :3001)
    public string[] OrigensEfetivas() =>
        Origens is { Length: > 0 } ? Origens : new[] { "http://localhost:4200", "http://localhost:3001" };
}
