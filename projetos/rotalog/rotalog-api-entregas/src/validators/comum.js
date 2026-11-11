const { z } = require('zod');

const NUMERO = /^-?\d+(\.\d+)?$/;

// ID numérico (BIGINT). Mantido como string; só é validado.
function idNumerico(mensagem) {
    return z.string({ invalid_type_error: mensagem }).regex(/^\d{1,18}$/, mensagem);
}

// Número JSON ou string numérica. null vale como ausente; undefined exige .optional() no uso.
// Coordenada 0 é válida.
function numero(mensagem, aceita) {
    return z.any().transform(function(valor, ctx) {
        if (valor === null) return null;
        let n = NaN;
        if (typeof valor === 'number') n = valor;
        else if (typeof valor === 'string' && NUMERO.test(valor.trim())) n = Number(valor);
        if (!Number.isFinite(n) || !aceita(n)) {
            ctx.addIssue({ code: 'custom', message: mensagem });
            return z.NEVER;
        }
        return n;
    });
}

const latitude = function(mensagem) {
    return numero(mensagem, function(n) { return n >= -90 && n <= 90; });
};
const longitude = function(mensagem) {
    return numero(mensagem, function(n) { return n >= -180 && n <= 180; });
};
const positivo = function(mensagem) {
    return numero(mensagem, function(n) { return n > 0; });
};

// Texto opcional com tamanho máximo (null permitido).
function textoOpcional(max, mensagem) {
    return z.string({ invalid_type_error: mensagem }).max(max, mensagem).nullable().optional();
}

module.exports = { idNumerico, numero, latitude, longitude, positivo, textoOpcional };
