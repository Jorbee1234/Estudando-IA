using api_notificacoes.Domain;

namespace api_notificacoes.Canais;

// Enquanto o envio é simulado, decide se um envio "falha". Troca o Random do código de produção
// por algo injetável (testes determinísticos). Some quando entrar um provedor real (ADR 0001, D4).
public interface IFalhaSimulada
{
    bool DeveFalhar(string canal);
}

public class FalhaSimuladaAleatoria : IFalhaSimulada
{
    public bool DeveFalhar(string canal) => canal switch
    {
        CanalNotificacao.Email => Random.Shared.Next(10) == 0,
        CanalNotificacao.Sms => Random.Shared.Next(5) == 0,
        _ => false
    };
}
