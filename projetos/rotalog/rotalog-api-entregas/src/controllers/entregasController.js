const EntregaService = require('../services/EntregaService');
const asyncHandler = require('../middleware/asyncHandler');

// A entrada já chega validada (validators/ + middleware/validar).

const listar = asyncHandler(async function(req, res) {
    res.json(await EntregaService.listar(req.query));
}, { mensagem: 'Erro interno do servidor' });

const estatisticas = asyncHandler(async function(req, res) {
    res.json(await EntregaService.estatisticas());
}, { mensagem: 'Erro ao buscar estatísticas' });

// A entrega já foi carregada por carregarEntrega.
function buscar(req, res) {
    res.json(req.entrega);
}

const buscarPorPedido = asyncHandler(async function(req, res) {
    const entrega = await EntregaService.buscarPorPedido(req.params.numeroPedido);
    if (!entrega) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    res.json(entrega);
}, { mensagem: 'Erro interno do servidor' });

const criar = asyncHandler(async function(req, res) {
    res.status(201).json(await EntregaService.criar(req.body));
}, { mensagem: 'Erro ao criar entrega' });

const atualizar = asyncHandler(async function(req, res) {
    res.json(await EntregaService.atualizar(req.entrega, req.body));
}, { mensagem: 'Erro ao atualizar entrega' });

const alterarStatus = asyncHandler(async function(req, res) {
    res.json(await EntregaService.alterarStatus(req.entrega, req.body.status));
}, { mensagem: 'Erro ao atualizar status' });

const atribuir = asyncHandler(async function(req, res) {
    res.json(await EntregaService.atribuir(req.entrega, req.body));
}, { mensagem: 'Erro ao atribuir entrega' });

const cancelar = asyncHandler(async function(req, res) {
    const entrega = await EntregaService.cancelar(req.entrega);
    res.json({ message: 'Entrega cancelada', entrega: entrega });
}, { mensagem: 'Erro ao cancelar entrega' });

module.exports = {
    listar, estatisticas, buscar, buscarPorPedido, criar, atualizar, alterarStatus, atribuir, cancelar
};
