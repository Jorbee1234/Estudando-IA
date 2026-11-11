// Cliente HTTP único das integrações: fetch nativo (Node 18+), timeout por AbortController,
// suporte a https e retry apenas para GET (erro de rede, timeout ou 502/503/504).
const { env } = require('../config/env');

const STATUS_COM_RETRY = [502, 503, 504];
const ESPERA_ENTRE_TENTATIVAS_MS = 100;

function esperar(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// Monta a URL codificando cada segmento de path.
function montarUrl(base, segmentos) {
    return base.replace(/\/+$/, '') + (segmentos || []).map(function(s) {
        return '/' + encodeURIComponent(String(s));
    }).join('');
}

async function tentar(url, opcoes, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(function() { controller.abort(); }, timeoutMs);
    try {
        const resposta = await fetch(url, {
            method: opcoes.method,
            headers: opcoes.headers,
            body: opcoes.body,
            signal: controller.signal
        });
        const texto = await resposta.text();
        return { status: resposta.status, texto: texto };
    } catch (erro) {
        if (controller.signal.aborted) {
            const timeout = new Error('Timeout após ' + timeoutMs + 'ms');
            timeout.code = 'ETIMEDOUT';
            throw timeout;
        }
        throw erro;
    } finally {
        clearTimeout(timer);
    }
}

async function request(url, opcoes) {
    opcoes = opcoes || {};
    const method = (opcoes.method || 'GET').toUpperCase();
    const timeoutMs = opcoes.timeoutMs !== undefined ? opcoes.timeoutMs : env.HTTP_TIMEOUT_MS;
    const retries = method === 'GET'
        ? (opcoes.retries !== undefined ? opcoes.retries : env.HTTP_RETRIES)
        : 0;

    let ultimoErro;
    for (let i = 0; i <= retries; i++) {
        if (i > 0) await esperar(ESPERA_ENTRE_TENTATIVAS_MS);
        try {
            const resultado = await tentar(url, {
                method: method,
                headers: opcoes.headers,
                body: opcoes.body
            }, timeoutMs);
            if (STATUS_COM_RETRY.indexOf(resultado.status) !== -1 && i < retries) continue;
            return resultado;
        } catch (erro) {
            ultimoErro = erro;
        }
    }
    throw ultimoErro;
}

// Resposta 2xx é convertida de JSON; demais status voltam com data = null.
async function requestJson(url, opcoes) {
    const resultado = await request(url, opcoes);
    const ok = resultado.status >= 200 && resultado.status < 300;
    let data = null;
    if (ok && resultado.texto) {
        try {
            data = JSON.parse(resultado.texto);
        } catch (e) {
            throw new Error('Erro ao parsear resposta: ' + e.message);
        }
    }
    return { status: resultado.status, ok: ok, data: data };
}

function getJson(url, opcoes) {
    return requestJson(url, Object.assign({}, opcoes, { method: 'GET' }));
}

function postJson(url, corpo, opcoes) {
    return requestJson(url, Object.assign({}, opcoes, {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, opcoes && opcoes.headers),
        body: JSON.stringify(corpo)
    }));
}

module.exports = { request, requestJson, getJson, postJson, montarUrl };
