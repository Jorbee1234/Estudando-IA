// A entrada já chega validada (validators/ + middleware/validar).
const RastreamentoService = require('../services/RastreamentoService');
const asyncHandler = require('../middleware/asyncHandler');

// Contrato com o portal de rastreamento: 404 (e não []) quando não há eventos.
const listar = asyncHandler(async function(req, res) {
    const eventos = await RastreamentoService.listarPorEntrega(req.params.entregaId);
    if (eventos.length === 0) {
        return res.status(404).json({ error: 'Nenhum evento de rastreamento encontrado' });
    }
    res.json(eventos);
}, { mensagem: 'Erro interno do servidor' });

const registrar = asyncHandler(async function(req, res) {
    const evento = await RastreamentoService.registrar(req.params.entregaId, req.body);
    if (!evento) {
        return res.status(404).json({ error: 'Entrega não encontrada' });
    }
    res.status(201).json(evento);
}, { mensagem: 'Erro ao registrar evento' });

const ultimo = asyncHandler(async function(req, res) {
    const evento = await RastreamentoService.ultimoPorEntrega(req.params.entregaId);
    if (!evento) {
        return res.status(404).json({ error: 'Nenhum evento encontrado' });
    }
    res.json(evento);
}, { mensagem: 'Erro interno do servidor' });

const porPedido = asyncHandler(async function(req, res) {
    const resumo = await RastreamentoService.resumoPorPedido(req.params.numeroPedido);
    if (!resumo) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    res.json(resumo);
}, { mensagem: 'Erro interno do servidor' });

module.exports = { listar, registrar, ultimo, porPedido };
