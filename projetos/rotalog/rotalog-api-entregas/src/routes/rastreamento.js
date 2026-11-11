// FIXME(ADR 0001 D4b): POST sem autenticação (fase 6). Só a busca por pedido tem rate limit.
const express = require('express');
const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');
const router = express.Router();
const controller = require('../controllers/rastreamentoController');
const validar = require('../middleware/validar');
const schemas = require('../validators/rastreamento');

// Limites lidos a cada requisição não são possíveis no pacote; valem os do início do processo.
const limitarPedido = rateLimit({
    windowMs: env.RATE_LIMIT_PEDIDO_JANELA_MS,
    limit: env.RATE_LIMIT_PEDIDO_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Muitas consultas. Tente novamente em instantes.' }
});

const validarEntrega = validar('params', schemas.entregaParams);

// Ordem original preservada: /:entregaId/ultimo precede /pedido/:numeroPedido.
router.get('/:entregaId', validarEntrega, controller.listar);
router.post('/:entregaId', validarEntrega, validar('body', schemas.registrarBody), controller.registrar);
router.get('/:entregaId/ultimo', validarEntrega, controller.ultimo);
router.get('/pedido/:numeroPedido', limitarPedido, validar('params', schemas.pedidoParams), controller.porPedido);

module.exports = router;
