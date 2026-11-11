const { z } = require('zod');
const { STATUS_VALIDOS } = require('../constants/status');
const { idNumerico, numero, latitude, longitude, positivo, textoOpcional } = require('./comum');

const MSG_ENDERECOS = 'Endereços de origem e destino são obrigatórios';
const MSG_ENDERECO_LONGO = 'Endereço deve ter no máximo 255 caracteres';
const MSG_ATRIBUIR = 'Placa do veículo e ID do motorista são obrigatórios';

const idParams = z.object({ id: idNumerico('ID inválido') });

const pedidoParams = z.object({
    numeroPedido: z.string().min(1, 'Número do pedido inválido').max(50, 'Número do pedido inválido')
});

const listarQuery = z.object({
    veiculo: z.string({ invalid_type_error: 'Veículo inválido' }).max(50, 'Veículo inválido').optional(),
    status: z.string({ invalid_type_error: 'Status inválido' }).max(20, 'Status inválido').optional(),
    motorista_id: z.string({ invalid_type_error: 'Motorista inválido' })
        .regex(/^\d{0,18}$/, 'Motorista inválido').optional()
});

const endereco = z.string({ required_error: MSG_ENDERECOS, invalid_type_error: MSG_ENDERECOS })
    .min(1, MSG_ENDERECOS).max(255, MSG_ENDERECO_LONGO);

const criarBody = z.object({
    origem_endereco: endereco,
    destino_endereco: endereco,
    origem_lat: latitude('Latitude de origem inválida').optional(),
    origem_lng: longitude('Longitude de origem inválida').optional(),
    destino_lat: latitude('Latitude de destino inválida').optional(),
    destino_lng: longitude('Longitude de destino inválida').optional(),
    peso_kg: positivo('Peso deve ser um número positivo').optional(),
    observacoes: textoOpcional(5000, 'Observações devem ter no máximo 5000 caracteres')
});

const atualizarBody = z.object({
    origem_endereco: textoOpcional(255, MSG_ENDERECO_LONGO),
    destino_endereco: textoOpcional(255, MSG_ENDERECO_LONGO),
    peso_kg: positivo('Peso deve ser um número positivo').optional(),
    observacoes: textoOpcional(5000, 'Observações devem ter no máximo 5000 caracteres')
});

const statusBody = z.object({
    status: z.enum(STATUS_VALIDOS, {
        errorMap: function() { return { message: 'Status inválido' }; }
    })
});

const atribuirBody = z.object({
    veiculo_placa: z.string({ required_error: MSG_ATRIBUIR, invalid_type_error: MSG_ATRIBUIR })
        .min(1, MSG_ATRIBUIR).max(7, 'Placa do veículo deve ter no máximo 7 caracteres'),
    motorista_id: numero(MSG_ATRIBUIR, function(n) { return Number.isInteger(n) && n > 0; })
        .refine(function(n) { return n !== null; }, MSG_ATRIBUIR),
    motorista_nome: textoOpcional(100, 'Nome do motorista deve ter no máximo 100 caracteres'),
    veiculo_modelo: textoOpcional(100, 'Modelo do veículo deve ter no máximo 100 caracteres')
});

module.exports = {
    idParams, pedidoParams, listarQuery, criarBody, atualizarBody, statusBody, atribuirBody
};
