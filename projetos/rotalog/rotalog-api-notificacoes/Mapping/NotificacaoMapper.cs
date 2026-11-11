using api_notificacoes.Domain;
using api_notificacoes.DTOs;
using api_notificacoes.Models;

namespace api_notificacoes.Mapping;

public static class NotificacaoMapper
{
    public static NotificacaoResponse ParaResponse(Notificacao notificacao) => new()
    {
        Id = notificacao.Id,
        Tipo = notificacao.Tipo,
        Canal = notificacao.Canal,
        Destinatario = notificacao.Destinatario,
        Assunto = notificacao.Assunto,
        Mensagem = notificacao.Mensagem,
        Status = notificacao.Status.ParaTexto(),
        Tentativas = notificacao.Tentativas,
        ErroMensagem = notificacao.ErroMensagem,
        ServicoOrigem = notificacao.ServicoOrigem,
        ReferenciaId = notificacao.ReferenciaId,
        DataCriacao = notificacao.DataCriacao,
        DataEnvio = notificacao.DataEnvio
    };
}
