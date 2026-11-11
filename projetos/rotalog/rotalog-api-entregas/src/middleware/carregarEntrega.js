const { Entrega, Rastreamento } = require('../models');
const asyncHandler = require('./asyncHandler');

// Carrega a entrega de req.params.id em req.entrega, ou responde 404.
// opcoes.incluirRastreamentos: inclui os eventos (mais recentes primeiro).
// opcoes.mensagemErro: texto de `error` quando a consulta falha (500).
function carregarEntrega(opcoes) {
    const config = opcoes || {};
    const consulta = config.incluirRastreamentos
        ? { include: [{ model: Rastreamento, as: 'rastreamentos', order: [['data_evento', 'DESC']] }] }
        : undefined;

    return asyncHandler(async function(req, res, next) {
        const entrega = await Entrega.findByPk(req.params.id, consulta);
        if (!entrega) {
            return res.status(404).json({ error: 'Entrega não encontrada' });
        }
        req.entrega = entrega;
        next();
    }, { mensagem: config.mensagemErro });
}

module.exports = carregarEntrega;
