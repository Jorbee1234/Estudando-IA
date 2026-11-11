const httpClient = require('./httpClient');
const { sequelize } = require('../config/database');
const { env } = require('../config/env');
const logger = require('../utils/logger');
const pacote = require('../../package.json');

function comTimeout(promessa, ms) {
    let timer;
    const limite = new Promise(function(resolve, reject) {
        timer = setTimeout(function() { reject(new Error('Timeout após ' + ms + 'ms')); }, ms);
    });
    return Promise.race([promessa, limite]).finally(function() { clearTimeout(timer); });
}

// Nunca rejeita: qualquer falha vira 'DOWN'.
async function verificar(nome, fn) {
    try {
        return (await fn()) ? 'UP' : 'DOWN';
    } catch (error) {
        logger.warn({ err: error, dependencia: nome }, 'Dependência indisponível no health check');
        return 'DOWN';
    }
}

function verificarHttp(url) {
    return httpClient.request(url, { timeoutMs: env.HEALTH_TIMEOUT_MS, retries: 0 })
        .then(function(r) { return r.status >= 200 && r.status < 300; });
}

async function consultar() {
    const resultados = await Promise.all([
        verificar('database', function() {
            return comTimeout(sequelize.authenticate().then(function() { return true; }), env.HEALTH_TIMEOUT_MS);
        }),
        verificar('api-frotas', function() {
            return verificarHttp(httpClient.montarUrl(env.API_FROTAS_URL, ['health']));
        }),
        verificar('api-notificacoes', function() {
            return verificarHttp(httpClient.montarUrl(env.API_NOTIFICACOES_URL, ['api', 'health']));
        })
    ]);

    const dependencies = {
        database: resultados[0],
        'api-frotas': resultados[1],
        'api-notificacoes': resultados[2]
    };

    // Só o banco derruba o serviço; as demais dependências aparecem como DOWN, sem mudar o status geral.
    return {
        service: 'api-entregas',
        status: dependencies.database === 'UP' ? 'UP' : 'DOWN',
        timestamp: new Date().toISOString(),
        version: pacote.version,
        dependencies: dependencies
    };
}

module.exports = { consultar };
