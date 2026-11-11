const STATUS = Object.freeze({
    PENDENTE: 'PENDENTE',
    ATRIBUIDA: 'ATRIBUIDA',
    EM_TRANSITO: 'EM_TRANSITO',
    ENTREGUE: 'ENTREGUE',
    CANCELADA: 'CANCELADA'
});

// A ordem faz parte do contrato: é devolvida em `statusValidos` no PATCH de status.
const STATUS_VALIDOS = Object.freeze([
    STATUS.PENDENTE,
    STATUS.ATRIBUIDA,
    STATUS.EM_TRANSITO,
    STATUS.ENTREGUE,
    STATUS.CANCELADA
]);

module.exports = { STATUS, STATUS_VALIDOS };
