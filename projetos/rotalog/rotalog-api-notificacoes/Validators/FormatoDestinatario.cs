using System.Text.RegularExpressions;
using api_notificacoes.Domain;

namespace api_notificacoes.Validators;

public static class FormatoDestinatario
{
    private static readonly Regex Email = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.Compiled);

    // DDI/DDD e número, só dígitos, "+" opcional (ex.: +5511999990001)
    private static readonly Regex Telefone = new(@"^\+?[0-9]{10,15}$", RegexOptions.Compiled);

    public static bool CanalConhecido(string? canal) =>
        canal is CanalNotificacao.Email or CanalNotificacao.Sms;

    // Sem canal vale o padrão (email), como no cadastro da notificação
    public static bool Valido(string? canal, string? destinatario)
    {
        if (string.IsNullOrEmpty(destinatario))
            return false;

        return (canal ?? CanalNotificacao.Email) == CanalNotificacao.Sms
            ? Telefone.IsMatch(destinatario)
            : Email.IsMatch(destinatario);
    }

    public static string Mensagem(string? canal) =>
        (canal ?? CanalNotificacao.Email) == CanalNotificacao.Sms
            ? "Campo 'destinatario' deve ser um telefone válido (só dígitos, com + opcional) para o canal sms"
            : "Campo 'destinatario' deve ser um e-mail válido para o canal email";
}
