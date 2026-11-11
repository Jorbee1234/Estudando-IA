const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');

const { env } = require('./config/env');
const logger = require('./utils/logger');
require('./models');

const authMiddleware = require('./middleware/auth');
const asyncHandler = require('./middleware/asyncHandler');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const healthService = require('./services/healthService');
const entregasRoutes = require('./routes/entregas');
const rastreamentoRoutes = require('./routes/rastreamento');
const frotasRoutes = require('./routes/frotas');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Origens vindas de CORS_ORIGINS (padrão: painel-admin e rastreamento locais). OPTIONS responde 200.
app.use(cors({
    origin: function(origin, callback) {
        const permitidas = env.CORS_ORIGINS;
        callback(null, permitidas.includes('*') || permitidas.includes(origin));
    },
    optionsSuccessStatus: 200
}));

app.use(express.json({ limit: env.BODY_LIMIT }));

// Log de requisição sem headers, body nem query string.
app.use(pinoHttp({
    logger: logger,
    serializers: {
        req: function(req) { return { method: req.method, url: req.url.split('?')[0] }; },
        res: function(res) { return { statusCode: res.statusCode }; }
    }
}));

// Banco fora do ar responde 503; api-frotas ou api-notificacoes fora do ar aparecem só como DOWN.
app.get('/api/health', asyncHandler(async (req, res) => {
    const saude = await healthService.consultar();
    res.status(saude.status === 'UP' ? 200 : 503).json(saude);
}));

app.use('/api/entregas', authMiddleware, entregasRoutes);
// FIXME(ADR 0001 D4b): sem auth no rastreamento; o portal público depende disso.
app.use('/api/rastreamento', rastreamentoRoutes);
app.use('/api/frotas', authMiddleware, frotasRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
