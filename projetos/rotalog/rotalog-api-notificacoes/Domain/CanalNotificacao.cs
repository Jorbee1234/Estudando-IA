namespace api_notificacoes.Domain;

// Constantes e não enum: o contrato aceita qualquer texto em "canal" (inclusive inválido, que vira
// "Canal não suportado" no envio). A restrição a { email, sms } entra com os validators (ADR 0001, fase 6).
public static class CanalNotificacao
{
    public const string Email = "email";
    public const string Sms = "sms";
}
