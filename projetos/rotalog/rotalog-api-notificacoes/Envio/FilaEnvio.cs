using System.Threading.Channels;
using api_notificacoes.Configuration;
using Microsoft.Extensions.Options;

namespace api_notificacoes.Envio;

// TentativasEsperadas evita enviar duas vezes: se /processar (ou outro envio) já tentou, o item é descartado
public record EnvioPendente(long NotificacaoId, int TentativasEsperadas);

public interface IFilaEnvio
{
    // false quando a fila está cheia; a notificação continua PENDENTE no banco
    bool TentarEnfileirar(long notificacaoId, int tentativasEsperadas);
}

// Fila em memória (ADR 0001, D4): o banco é a fonte da verdade, a fila só tira o envio de dentro da requisição.
public sealed class FilaEnvio : IFilaEnvio
{
    private readonly Channel<EnvioPendente> _canal;
    private int _emAndamento;

    public FilaEnvio(IOptions<EnvioOptions> options)
    {
        _canal = Channel.CreateBounded<EnvioPendente>(new BoundedChannelOptions(Math.Max(1, options.Value.Capacidade))
        {
            SingleReader = true,
            FullMode = BoundedChannelFullMode.Wait
        });
    }

    public ChannelReader<EnvioPendente> Leitor => _canal.Reader;

    // Enfileirados e ainda não concluídos (usado para encerrar com limpeza e nos testes)
    public int EmAndamento => Volatile.Read(ref _emAndamento);

    public bool TentarEnfileirar(long notificacaoId, int tentativasEsperadas)
    {
        Interlocked.Increment(ref _emAndamento); // antes de escrever: o worker pode concluir logo em seguida
        if (_canal.Writer.TryWrite(new EnvioPendente(notificacaoId, tentativasEsperadas)))
            return true;

        Interlocked.Decrement(ref _emAndamento);
        return false;
    }

    public void Concluir() => Interlocked.Decrement(ref _emAndamento);
}
