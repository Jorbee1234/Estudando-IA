const { Entrega, Rastreamento } = require('../models');
const { sequelize } = require('../config/database');
const { STATUS } = require('../constants/status');
const logger = require('../utils/logger');

function inserirEvento(entregaId, evento, descricao, transaction) {
    return Rastreamento.create({
        entrega_id: entregaId,
        evento: evento,
        descricao: descricao,
        data_evento: new Date()
    }, { transaction: transaction });
}

// Salva a entrega e registra o evento na mesma transação: se um falhar, nenhum persiste.
async function registrarEvento(entrega, evento, descricao) {
    entrega.data_atualizacao = new Date();
    await sequelize.transaction(async function(transaction) {
        await entrega.save({ transaction: transaction });
        await inserirEvento(entrega.id, evento, descricao, transaction);
    });
    logger.info({ numeroPedido: entrega.numero_pedido, evento: evento }, 'Evento de entrega registrado');
}

// Sem paginação (contrato: array puro). `veiculo` é usado pela api-frotas.
function listar(filtros) {
    const where = {};

    if (filtros.veiculo) {
        where.veiculo_placa = filtros.veiculo;
    }
    if (filtros.status) {
        where.status = filtros.status.toUpperCase();
    }
    if (filtros.motorista_id) {
        where.motorista_id = filtros.motorista_id;
    }

    return Entrega.findAll({
        where,
        order: [['data_criacao', 'DESC']],
        include: [{
            model: Rastreamento,
            as: 'rastreamentos',
            limit: 5,
            order: [['data_evento', 'DESC']]
        }]
    });
}

async function estatisticas() {
    const query = `
        SELECT
            status,
            COUNT(*) as total,
            COALESCE(AVG(distancia_km), 0) as distancia_media,
            COALESCE(AVG(peso_kg), 0) as peso_medio
        FROM entregas.entregas
        GROUP BY status
    `;

    const stats = await sequelize.query(query, { type: sequelize.constructor.QueryTypes.SELECT });
    const total = stats.reduce(function(acc, s) { return acc + parseInt(s.total); }, 0);

    return {
        total: total,
        por_status: stats,
        gerado_em: new Date().toISOString()
    };
}

function buscarPorPedido(numeroPedido) {
    return Entrega.findOne({ where: { numero_pedido: numeroPedido } });
}

function informado(valor) {
    return valor !== undefined && valor !== null;
}

// Distância aproximada (não é Haversine) e 2 min/km. Coordenada 0 é válida.
function calcularRota(origemLat, origemLng, destinoLat, destinoLng) {
    let distanciaKm = null;
    if (informado(origemLat) && informado(origemLng) && informado(destinoLat) && informado(destinoLng)) {
        const dLat = Math.abs(destinoLat - origemLat);
        const dLng = Math.abs(destinoLng - origemLng);
        distanciaKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
    }
    const tempoEstimado = distanciaKm ? Math.ceil(distanciaKm * 2) : null;
    return { distanciaKm: distanciaKm, tempoEstimado: tempoEstimado };
}

async function criar(dados) {
    const numeroPedido = 'PED-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const rota = calcularRota(dados.origem_lat, dados.origem_lng, dados.destino_lat, dados.destino_lng);

    const entrega = await sequelize.transaction(async function(transaction) {
        const nova = await Entrega.create({
            numero_pedido: numeroPedido,
            origem_endereco: dados.origem_endereco,
            destino_endereco: dados.destino_endereco,
            origem_lat: informado(dados.origem_lat) ? dados.origem_lat : null,
            origem_lng: informado(dados.origem_lng) ? dados.origem_lng : null,
            destino_lat: informado(dados.destino_lat) ? dados.destino_lat : null,
            destino_lng: informado(dados.destino_lng) ? dados.destino_lng : null,
            peso_kg: informado(dados.peso_kg) ? dados.peso_kg : null,
            distancia_km: rota.distanciaKm,
            tempo_estimado_minutos: rota.tempoEstimado,
            status: STATUS.PENDENTE,
            observacoes: dados.observacoes || null,
            data_criacao: new Date(),
            data_atualizacao: new Date()
        }, { transaction: transaction });

        await inserirEvento(nova.id, 'PEDIDO_CRIADO', 'Pedido de entrega criado: ' + numeroPedido, transaction);
        return nova;
    });

    logger.info({ numeroPedido }, 'Entrega criada');
    return entrega;
}

// Atualização sem evento de rastreamento.
async function atualizar(entrega, dados) {
    if (dados.origem_endereco) entrega.origem_endereco = dados.origem_endereco;
    if (dados.destino_endereco) entrega.destino_endereco = dados.destino_endereco;
    if (dados.peso_kg !== undefined) entrega.peso_kg = dados.peso_kg;
    if (dados.observacoes !== undefined) entrega.observacoes = dados.observacoes;
    entrega.data_atualizacao = new Date();

    await entrega.save();
    return entrega;
}

// FIXME(ADR 0001 fase 6): qualquer transição é aceita (ENTREGUE -> PENDENTE).
async function alterarStatus(entrega, status) {
    const statusAnterior = entrega.status;
    entrega.status = status;

    if (status === STATUS.EM_TRANSITO) {
        entrega.data_coleta = new Date();
    }
    if (status === STATUS.ENTREGUE) {
        entrega.data_entrega = new Date();
    }

    await registrarEvento(entrega, 'STATUS_ALTERADO', 'Status alterado de ' + statusAnterior + ' para ' + status);
    return entrega;
}

// Não consulta a api-frotas: veículo e motorista não são verificados.
async function atribuir(entrega, dados) {
    entrega.veiculo_placa = dados.veiculo_placa;
    entrega.motorista_id = dados.motorista_id;
    entrega.motorista_nome = dados.motorista_nome || null;
    entrega.veiculo_modelo = dados.veiculo_modelo || null;
    entrega.status = STATUS.ATRIBUIDA;

    await registrarEvento(
        entrega,
        'ENTREGA_ATRIBUIDA',
        'Atribuída ao veículo ' + dados.veiculo_placa + ' e motorista #' + dados.motorista_id
    );
    return entrega;
}

// Cancelamento lógico. Cancela inclusive entrega já ENTREGUE.
async function cancelar(entrega) {
    entrega.status = STATUS.CANCELADA;
    await registrarEvento(entrega, 'ENTREGA_CANCELADA', 'Entrega cancelada');
    return entrega;
}

module.exports = {
    registrarEvento,
    listar,
    estatisticas,
    buscarPorPedido,
    criar,
    atualizar,
    alterarStatus,
    atribuir,
    cancelar
};
