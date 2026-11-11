// Único ponto que carrega o dotenv e lê process.env.
// Os valores são lidos no momento do uso (getters), e não na importação.
// Não há credencial de fallback: DB_USER e DB_PASSWORD são obrigatórios.
const dotenv = require('dotenv');

dotenv.config();

const OBRIGATORIAS = ['DB_USER', 'DB_PASSWORD'];

function inteiro(nome, padrao) {
    const valor = parseInt(process.env[nome], 10);
    return Number.isNaN(valor) ? padrao : valor;
}

const env = {
    get NODE_ENV() { return process.env.NODE_ENV; },
    get isProduction() { return process.env.NODE_ENV === 'production'; },
    get PORT() { return inteiro('PORT', 3000); },
    get LOG_LEVEL() { return process.env.LOG_LEVEL || 'info'; },

    get DB_HOST() { return process.env.DB_HOST || 'localhost'; },
    get DB_PORT() { return inteiro('DB_PORT', 5432); },
    get DB_NAME() { return process.env.DB_NAME || 'rotalog'; },
    get DB_SCHEMA() { return process.env.DB_SCHEMA || 'entregas'; },
    get DB_USER() { return process.env.DB_USER; },
    get DB_PASSWORD() { return process.env.DB_PASSWORD; },

    get JWT_SECRET() { return process.env.JWT_SECRET; },

    get API_FROTAS_URL() { return process.env.API_FROTAS_URL || 'http://localhost:8080/api'; },
    get API_NOTIFICACOES_URL() { return process.env.API_NOTIFICACOES_URL || 'http://localhost:5000'; },

    get HTTP_TIMEOUT_MS() { return inteiro('HTTP_TIMEOUT_MS', 5000); },
    get HTTP_RETRIES() { return inteiro('HTTP_RETRIES', 1); },

    // Padrão: os dois frontends locais (painel-admin e rastreamento). `*` libera qualquer origem.
    get CORS_ORIGINS() {
        const valor = process.env.CORS_ORIGINS || 'http://localhost:4200,http://localhost:3001';
        return valor.split(',').map(function(o) { return o.trim(); }).filter(Boolean);
    },
    // Rate limit do portal público (GET /api/rastreamento/pedido/:numero), por IP.
    get RATE_LIMIT_PEDIDO_MAX() { return inteiro('RATE_LIMIT_PEDIDO_MAX', 60); },
    get RATE_LIMIT_PEDIDO_JANELA_MS() { return inteiro('RATE_LIMIT_PEDIDO_JANELA_MS', 60000); },
    get BODY_LIMIT() { return process.env.BODY_LIMIT || '100kb'; },

    get HEALTH_TIMEOUT_MS() { return inteiro('HEALTH_TIMEOUT_MS', 2000); },
    get SHUTDOWN_TIMEOUT_MS() { return inteiro('SHUTDOWN_TIMEOUT_MS', 10000); }
};

// Lança com a lista das variáveis ausentes (nunca com os valores).
function validarEnv() {
    const ausentes = OBRIGATORIAS.filter(function(nome) { return !process.env[nome]; });
    if (ausentes.length > 0) {
        throw new Error('Variáveis de ambiente obrigatórias ausentes: ' + ausentes.join(', '));
    }
}

module.exports = { env, validarEnv };
