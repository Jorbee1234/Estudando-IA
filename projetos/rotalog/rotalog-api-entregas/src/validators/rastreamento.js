const { z } = require('zod');
const { idNumerico, latitude, longitude, textoOpcional } = require('./comum');

const entregaParams = z.object({ entregaId: idNumerico('ID da entrega inválido') });

const pedidoParams = z.object({
    numeroPedido: z.string().min(1, 'Número do pedido inválido').max(50, 'Número do pedido inválido')
});

const registrarBody = z.object({
    latitude: latitude('Latitude inválida').optional(),
    longitude: longitude('Longitude inválida').optional(),
    evento: textoOpcional(50, 'Evento deve ter no máximo 50 caracteres'),
    descricao: textoOpcional(2000, 'Descrição deve ter no máximo 2000 caracteres')
});

module.exports = { entregaParams, pedidoParams, registrarBody };
