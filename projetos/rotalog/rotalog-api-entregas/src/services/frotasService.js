// FIXME(ADR 0001 D3/MAPA T4): sem cache nem circuit breaker.
const httpClient = require('./httpClient');
const logger = require('../utils/logger');
const { env } = require('../config/env');

function consultar(segmentos) {
    return httpClient.getJson(httpClient.montarUrl(env.API_FROTAS_URL, segmentos));
}

// Devolve o veículo, ou null se a api-frotas responder 404.
async function buscarVeiculoPorPlaca(placa) {
    logger.debug({ placa }, 'Buscando veículo no api-frotas');
    const r = await consultar(['veiculos', 'placa', placa]);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('Erro ao buscar veículo: HTTP ' + r.status);
    return r.data;
}

// Devolve o motorista, ou null se a api-frotas responder 404.
async function buscarMotoristaPorId(id) {
    logger.debug({ motoristaId: id }, 'Buscando motorista no api-frotas');
    const r = await consultar(['motoristas', id]);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('Erro ao buscar motorista: HTTP ' + r.status);
    return r.data;
}

// Disponível = veículo ATIVO. A api-frotas já tem essa verificação (lógica duplicada).
async function verificarDisponibilidadeVeiculo(placa) {
    const veiculo = await buscarVeiculoPorPlaca(placa);
    if (!veiculo) {
        return { disponivel: false, motivo: 'Veículo não encontrado' };
    }
    if (veiculo.status !== 'ATIVO') {
        return { disponivel: false, motivo: 'Veículo com status: ' + veiculo.status };
    }
    return { disponivel: true, veiculo: veiculo };
}

async function listarVeiculosAtivos() {
    const r = await consultar(['veiculos', 'status', 'ATIVO']);
    if (!r.ok) throw new Error('Erro ao listar veículos: HTTP ' + r.status);
    return r.data;
}

module.exports = {
    buscarVeiculoPorPlaca,
    buscarMotoristaPorId,
    verificarDisponibilidadeVeiculo,
    listarVeiculosAtivos
};
