const { env, validarEnv } = require('./config/env');
const app = require('./app');
const logger = require('./utils/logger');
const { sequelize, testConnection } = require('./config/database');
const { criarEncerramento } = require('./utils/encerramento');

const AMBIENTE = env.NODE_ENV || 'development';

let servidor = null;

const encerrar = criarEncerramento({
    logger: logger,
    timeoutMs: env.SHUTDOWN_TIMEOUT_MS,
    obterServidor: function() { return servidor; },
    fecharBanco: function() { return sequelize.close(); },
    sair: function(codigo) { process.exit(codigo); }
});

// FIXME(MAPA §5.2): sync sem migrations; schema tem 3 fontes de verdade.
async function startServer() {
    try {
        validarEnv();
        await testConnection();
        await sequelize.sync({ alter: false });

        if (!env.isProduction) {
            logger.warn('Autenticação em bypass: NODE_ENV diferente de production');
        }

        servidor = app.listen(env.PORT, () => {
            logger.info({ port: env.PORT, env: AMBIENTE }, 'API Entregas no ar');
        });
    } catch (error) {
        logger.fatal({ err: error }, 'Falha ao iniciar o servidor');
        encerrar('falha na subida', 1);
    }
}

startServer();

process.on('SIGTERM', function() { encerrar('SIGTERM', 0); });
process.on('SIGINT', function() { encerrar('SIGINT', 0); });

process.on('unhandledRejection', function(reason) {
    logger.error({ err: reason }, 'Unhandled rejection');
});

process.on('uncaughtException', function(error) {
    logger.fatal({ err: error }, 'Uncaught exception');
    encerrar('uncaughtException', 1);
});
