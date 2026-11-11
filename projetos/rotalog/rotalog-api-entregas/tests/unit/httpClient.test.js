const http = require('http');
const httpClient = require('../../src/services/httpClient');

let server;
let base;
let handler;
let chamadas;

beforeAll((done) => {
    server = http.createServer((req, res) => {
        let corpo = '';
        req.on('data', (c) => { corpo += c; });
        req.on('end', () => {
            chamadas.push({ method: req.method, url: req.url, corpo, headers: req.headers });
            handler(req, res);
        });
    });
    server.listen(0, () => {
        base = 'http://localhost:' + server.address().port;
        done();
    });
});

afterAll((done) => {
    server.closeAllConnections();
    server.close(done);
});

beforeEach(() => { chamadas = []; });

function responder(status, corpo) {
    handler = (req, res) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(typeof corpo === 'string' ? corpo : JSON.stringify(corpo));
    };
}

describe('montarUrl', () => {
    test('codifica cada segmento e remove barra final da base', () => {
        expect(httpClient.montarUrl('http://h/api/', ['veiculos', 'placa', 'A B/1?x=1']))
            .toBe('http://h/api/veiculos/placa/A%20B%2F1%3Fx%3D1');
    });

    test('aceita números e base sem segmentos', () => {
        expect(httpClient.montarUrl('http://h', ['motoristas', 7])).toBe('http://h/motoristas/7');
        expect(httpClient.montarUrl('http://h')).toBe('http://h');
    });
});

describe('getJson', () => {
    test('200 devolve o JSON', async () => {
        responder(200, { a: 1 });
        const r = await httpClient.getJson(base + '/x');
        expect(r).toEqual({ status: 200, ok: true, data: { a: 1 } });
    });

    test('404 devolve ok=false e data=null, sem tentar parsear', async () => {
        responder(404, 'não é json');
        const r = await httpClient.getJson(base + '/x');
        expect(r).toEqual({ status: 404, ok: false, data: null });
    });

    test('JSON inválido em 2xx lança', async () => {
        responder(200, '{ruim');
        await expect(httpClient.getJson(base + '/x')).rejects.toThrow(/Erro ao parsear resposta/);
    });

    test('timeout lança ETIMEDOUT', async () => {
        handler = () => {};
        await expect(httpClient.getJson(base + '/x', { timeoutMs: 100, retries: 0 }))
            .rejects.toMatchObject({ code: 'ETIMEDOUT' });
    });

    test('servidor fora do ar lança', async () => {
        await expect(httpClient.getJson('http://localhost:1/x', { retries: 0 })).rejects.toThrow();
    });
});

describe('retry', () => {
    test('GET repete em 503 e devolve a última resposta', async () => {
        responder(503, {});
        const r = await httpClient.getJson(base + '/x', { retries: 2 });
        expect(r.status).toBe(503);
        expect(chamadas).toHaveLength(3);
    });

    test('GET se recupera quando a segunda tentativa funciona', async () => {
        let n = 0;
        handler = (req, res) => {
            n++;
            res.writeHead(n === 1 ? 503 : 200, { 'Content-Type': 'application/json' });
            res.end('{"ok":true}');
        };
        const r = await httpClient.getJson(base + '/x', { retries: 1 });
        expect(r.data).toEqual({ ok: true });
        expect(chamadas).toHaveLength(2);
    });

    test('GET não repete em 500 nem 404', async () => {
        responder(500, {});
        await httpClient.getJson(base + '/x', { retries: 3 });
        responder(404, {});
        await httpClient.getJson(base + '/x', { retries: 3 });
        expect(chamadas).toHaveLength(2);
    });

    test('POST nunca repete', async () => {
        responder(503, {});
        await httpClient.postJson(base + '/x', { a: 1 }, { retries: 3 });
        expect(chamadas).toHaveLength(1);
    });

    test('GET repete em erro de rede', async () => {
        const inicio = Date.now();
        await expect(httpClient.getJson('http://localhost:1/x', { retries: 1 })).rejects.toThrow();
        expect(Date.now() - inicio).toBeGreaterThanOrEqual(90);
    });
});

describe('postJson', () => {
    test('envia JSON com Content-Type', async () => {
        responder(201, { id: 1 });
        const r = await httpClient.postJson(base + '/x', { tipo: 'A' });
        expect(r.data).toEqual({ id: 1 });
        expect(chamadas[0].method).toBe('POST');
        expect(chamadas[0].headers['content-type']).toBe('application/json');
        expect(JSON.parse(chamadas[0].corpo)).toEqual({ tipo: 'A' });
    });
});
