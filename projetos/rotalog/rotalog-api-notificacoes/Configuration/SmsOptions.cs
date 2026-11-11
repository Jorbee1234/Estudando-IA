namespace api_notificacoes.Configuration;

public class SmsOptions
{
    public const string Secao = "SmsSettings";

    public string? ApiUrl { get; set; }
    public string? ApiKey { get; set; }
}
