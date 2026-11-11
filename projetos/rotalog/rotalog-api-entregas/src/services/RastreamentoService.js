const { Entrega, Rastreamento } = require('../models');
const logger = require('../utils/logger');

function listarPorEntrega(entregaId) {
    return Rastreamento.porEntrega(entregaId);
}

function ultimoPorEntrega(entregaId) {
    return Rastreamento.findOne({
        where: { entrega_id: entregaId },
        order: [['data_evento', 'DESC']]
    });
}

// Devolve null se o pedido não existe.
async function resumoPorPedido(numeroPedido) {
    const entrega = await Entrega.findOne({ where: { numero_pedido: numeroPedido } });
    if (!entrega) return null;

    const eventos = await Rastreamento.porEntrega(entrega.id);
    return {
        pedido: entrega.numero_pedido,
        status: entrega.status,
        origem: entrega.origem_endereco,
        destino: entrega.destino_endereco,
        data_criacao: entrega.data_criacao,
        data_entrega: entrega.data_entrega,
        // Adicionados para o portal público desenhar o mapa; sem motorista nem placa (ADR 0002 do rastreamento, D5b).
        origem_lat: entrega.origem_lat,
        origem_lng: entrega.origem_lng,
        destino_lat: entrega.destino_lat,
        destino_lng: entrega.destino_lng,
        distancia_km: entrega.distancia_km,
        tempo_estimado_minutos: entrega.tempo_estimado_minutos,
        eventos: eventos
    };
}

// Devolve null se a entrega não existe. Coordenada 0 é válida.
async function registrar(entregaId, dados) {
    const entrega = await Entrega.findByPk(entregaId);
    if (!entrega) return null;

    const evento = await Rastreamento.create({
        entrega_id: entregaId,
        latitude: dados.latitude === undefined ? null : dados.latitude,
        longitude: dados.longitude === undefined ? null : dados.longitude,
        evento: dados.evento || 'POSICAO_ATUALIZADA',
        descricao: dados.descricao || null,
        data_evento: new Date()
    });
    logger.info({ entregaId, evento: dados.evento }, 'Evento de rastreamento registrado');
    return evento;
}

module.exports = { listarPorEntrega, ultimoPorEntrega, resumoPorPedido, registrar };
