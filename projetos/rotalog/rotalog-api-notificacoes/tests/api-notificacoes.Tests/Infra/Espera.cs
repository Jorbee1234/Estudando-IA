using api_notificacoes.Envio;
using Microsoft.Extensions.DependencyInjection;

namespace api_notificacoes.Tests.Infra;

/// <summary>O envio acontece em segundo plano (ADR 0001, D4): os testes esperam o efeito, sem Thread.Sleep fixo.</summary>
public static class Espera
{
    public static async Task AteAsync(Func<bool> condicao, string descricao, int timeoutMs = 10_000)
    {
        var limite = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        while (DateTime.UtcNow < limite)
        {
            if (condicao()) return;
            await Task.Delay(25);
        }
        throw new TimeoutException($"Tempo esgotado esperando: {descricao}");
    }

    /// <summary>Espera o worker terminar tudo que está na fila deste host (evita que um envio atrasado pegue o banco do teste seguinte).</summary>
    public static void FilaVazia(IServiceProvider servicos, int timeoutMs = 10_000)
    {
        var fila = servicos.GetRequiredService<FilaEnvio>();
        AteAsync(() => fila.EmAndamento == 0, "fila de envio esvaziar", timeoutMs).GetAwaiter().GetResult();
    }

    public static Task NotificacaoTentadaAsync(long id, int tentativas = 1) =>
        AteAsync(() => BancoDeTeste.Escalar<int>($"SELECT tentativas FROM notificacoes.notificacoes WHERE id = {id}") >= tentativas,
            $"notificação {id} ter {tentativas} tentativa(s)");
}
