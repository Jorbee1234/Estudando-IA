namespace api_notificacoes.Configuration;

public class EnvioOptions
{
    public const string Secao = "Envio";

    // Notificações aguardando envio em memória. Cheia: a notificação segue PENDENTE no banco
    // e é enviada por /processar, nunca se perde nem derruba a requisição.
    public int Capacidade { get; set; } = 1000;

    // Ao subir, reenfileira o que ficou PENDENTE sem nenhuma tentativa (a fila é só em memória)
    public bool RecuperarPendentesNaInicializacao { get; set; } = true;
}
