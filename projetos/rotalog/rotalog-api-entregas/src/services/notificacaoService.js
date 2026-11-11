// Código sem uso: nenhum arquivo importa este módulo e nenhuma notificação sai da API.
// Decisão pendente (ADR 0001 D3): ligar atrás de ENABLE_NOTIFICATIONS na fase 6 ou remover.
const httpClient = require('./httpClient');
const logger = require('../utils/logger');
const { env } = require('../config/env');

// Rejeita em caso de erro. Os notificarX abaixo nunca rejeitam (falha de notificação não derruba a requisição).
async function enviarNotificacao(tipo, destinatario, mensagem) {
    const url = httpClient.montarUrl(env.API_NOTIFICACOES_URL, ['api', 'notificacoes']);
    logger.debug({ tipo }, 'Enviando notificação');

    const r = await httpClient.postJson(url, {
        tipo: tipo,
        destinatario: destinatario,
        mensagem: mensagem,
        canal: 'email'
    });

    if (!r.ok) {
        throw new Error('HTTP ' + r.status);
    }
    logger.debug({ tipo }, 'Notificação enviada');
    return r.data;
}

async function enviarSemFalhar(tipo, destinatario, mensagem) {
    try {
        await enviarNotificacao(tipo, destinatario, mensagem);
    } catch (error) {
        logger.error({ err: error, tipo }, 'Falha ao enviar notificação');
    }
}

function notificarEntregaCriada(entrega) {
    return enviarSemFalhar(
        'ENTREGA_CRIADA',
        'operacao@rotalog.com',
        'Nova entrega criada: ' + entrega.numero_pedido + ' - De: ' + entrega.origem_endereco + ' Para: ' + entrega.destino_endereco
    );
}

function notificarMudancaStatus(entrega, statusAnterior, statusNovo) {
    return enviarSemFalhar(
        'STATUS_ENTREGA',
        'operacao@rotalog.com',
        'Entrega ' + entrega.numero_pedido + ' mudou de ' + statusAnterior + ' para ' + statusNovo
    );
}

function notificarEntregaConcluida(entrega) {
    return enviarSemFalhar(
        'ENTREGA_CONCLUIDA',
        'cliente@rotalog.com', // FIXME: deveria ser o email do cliente real
        'Sua entrega ' + entrega.numero_pedido + ' foi entregue com sucesso!'
    );
}

function notificarAtraso(entrega) {
    return enviarSemFalhar(
        'ENTREGA_ATRASADA',
        'gestor@rotalog.com',
        'Entrega ' + entrega.numero_pedido + ' está atrasada. Destino: ' + entrega.destino_endereco
    );
}

module.exports = {
    enviarNotificacao,
    notificarEntregaCriada,
    notificarMudancaStatus,
    notificarEntregaConcluida,
    notificarAtraso
};
