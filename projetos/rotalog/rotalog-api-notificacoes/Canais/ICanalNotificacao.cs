using api_notificacoes.Models;

namespace api_notificacoes.Canais;

public interface ICanalNotificacao
{
    // Valor gravado em Notificacao.Canal (comparação exata, como antes da extração)
    string Nome { get; }

    // Lança exceção quando o envio falha; quem chama registra o erro e conta a tentativa
    Task EnviarAsync(Notificacao notificacao, CancellationToken cancellationToken = default);
}
