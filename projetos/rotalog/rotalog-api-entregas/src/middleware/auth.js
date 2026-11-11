const { env } = require('../config/env');

// FIXME(ADR 0001 D4b): JWT real (assinatura e expiração, com env.JWT_SECRET) na fase 6.
// Hoje o token não é verificado.
function authMiddleware(req, res, next) {
    // Bypass fora de produção (inclui NODE_ENV vazio). Contrato atual, preservado até a fase 6.
    if (!env.isProduction) {
        return next();
    }

    var authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    var parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Token mal formatado' });
    }

    var token = parts[1];

    if (!token || token.length < 10) {
        return res.status(401).json({ error: 'Token inválido' });
    }

    req.user = { id: 1, nome: 'Admin', role: 'admin' };

    next();
}

module.exports = authMiddleware;
