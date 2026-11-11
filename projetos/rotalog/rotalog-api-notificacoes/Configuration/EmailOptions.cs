namespace api_notificacoes.Configuration;

public class EmailOptions
{
    public const string Secao = "EmailSettings";

    public string? SmtpServer { get; set; }
    public int SmtpPort { get; set; }
    public string? SenderEmail { get; set; }
    public string? SenderPassword { get; set; }
}
