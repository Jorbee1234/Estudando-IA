using api_notificacoes.Canais;

namespace api_notificacoes.Tests.Infra;

/// <summary>Simulador de falha determinístico: sempre falha ou nunca falha.</summary>
public class FalhaFixa : IFalhaSimulada
{
    private readonly bool _falha;
    public FalhaFixa(bool falha) => _falha = falha;
    public bool DeveFalhar(string canal) => _falha;
}
