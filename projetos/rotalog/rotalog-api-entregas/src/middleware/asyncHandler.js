const logger = require('../utils/logger');

// Envolve um handler async: qualquer erro vira log + resposta 500, sem try/catch em cada rota.
// `mensagem` é o texto de `error` da resposta (cada rota tem o seu, parte do contrato).
// A mensagem interna do erro vai só para o log, nunca para o cliente.
function asyncHandler(fn, opcoes) {
    const config = opcoes || {};
    return function(req, res, next) {
        new Promise(function(resolve) { resolve(fn(req, res, next)); }).catch(function(error) {
            logger.error({ err: error, method: req.method, rota: req.route && req.route.path }, 'Erro no handler');
            if (res.headersSent) return next(error);
            res.status(500).json({ error: config.mensagem || 'Erro interno do servidor' });
        });
    };
}

module.exports = asyncHandler;
