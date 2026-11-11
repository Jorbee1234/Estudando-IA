const logger = require('../utils/logger');

// Nunca devolve stack. Erros 5xx não expõem a mensagem interna (vai só para o log).
function errorHandler(err, req, res, next) {
    const status = err.status || 500;
    logger.error({ err: err, method: req.method, url: req.path }, 'Erro não tratado');

    res.status(status).json({
        error: status >= 500 ? 'Erro interno do servidor' : (err.message || 'Requisição inválida')
    });
}

function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path,
        method: req.method
    });
}

module.exports = { errorHandler, notFoundHandler };
