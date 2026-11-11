const express = require('express');
const router = express.Router();
const controller = require('../controllers/entregasController');
const carregarEntrega = require('../middleware/carregarEntrega');
const validar = require('../middleware/validar');
const schemas = require('../validators/entregas');
const { STATUS_VALIDOS } = require('../constants/status');

const validarId = validar('params', schemas.idParams);

// A ordem importa: /stats e /pedido/:numeroPedido antes de /:id.
// Em rotas com :id, o 404 da entrega vem antes da validação do body.
router.get('/', validar('query', schemas.listarQuery), controller.listar);
router.get('/stats', controller.estatisticas);
router.get('/pedido/:numeroPedido', validar('params', schemas.pedidoParams), controller.buscarPorPedido);
router.post('/', validar('body', schemas.criarBody), controller.criar);
router.get('/:id', validarId,
    carregarEntrega({ incluirRastreamentos: true, mensagemErro: 'Erro interno do servidor' }),
    controller.buscar);
router.put('/:id', validarId,
    carregarEntrega({ mensagemErro: 'Erro ao atualizar entrega' }),
    validar('body', schemas.atualizarBody),
    controller.atualizar);
router.patch('/:id/status', validarId,
    carregarEntrega({ mensagemErro: 'Erro ao atualizar status' }),
    validar('body', schemas.statusBody, { extra: { statusValidos: STATUS_VALIDOS } }),
    controller.alterarStatus);
router.patch('/:id/atribuir', validarId,
    carregarEntrega({ mensagemErro: 'Erro ao atribuir entrega' }),
    validar('body', schemas.atribuirBody),
    controller.atribuir);
router.delete('/:id', validarId,
    carregarEntrega({ mensagemErro: 'Erro ao cancelar entrega' }),
    controller.cancelar);

module.exports = router;
