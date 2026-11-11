// Contrato com a api-frotas: um servidor HTTP local faz o papel do api-frotas.
const http = require('http');
const request = require('supertest');

jest.mock('../../src/models', () => require('../helpers/mockModels').build());
jest.mock('../../src/config/database', () => ({ sequelize: {}, testConnection: jest.fn() }));

let server;
let handler;
const requisicoes = [];

beforeAll((done) => {
    server = http.createServer((req, res) => {
        requisicoes.push(req.url);
        handler(req, res);
    });
    server.listen(0, () => {
        process.env.API_FROTAS_URL = 'http://localhost:' + server.address().port + '/api';
        done();
    });
});

afterAll((done) => (server.listening ? server.close(done) : done()));

beforeEach(() => { requisicoes.length = 0; });

function responder(status, body) {
    handler = (req, res) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(typeof body === 'string' ? body : JSON.stringify(body));
    };
}

// o app só pode ser carregado depois que API_FROTAS_URL existe (lida na importação)
let app;
beforeAll(() => { app = require('../../src/app'); });

describe('proxy /api/frotas', () => {
    test('veículos disponíveis chama /veiculos/status/ATIVO', async () => {
        responder(200, [{ placa: 'ABC1234' }]);
        const res = await request(app).get('/api/frotas/veiculos/disponiveis');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ placa: 'ABC1234' }]);
        expect(requisicoes).toEqual(['/api/veiculos/status/ATIVO']);
    });

    test('veículo por placa chama /veiculos/placa/{placa}', async () => {
        responder(200, { placa: 'ABC1234', status: 'ATIVO' });
        const res = await request(app).get('/api/frotas/veiculos/ABC1234');
        expect(res.status).toBe(200);
        expect(requisicoes).toEqual(['/api/veiculos/placa/ABC1234']);
    });

    test('404 do api-frotas vira 404', async () => {
        responder(404, {});
        const res = await request(app).get('/api/frotas/veiculos/XXX');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Veículo não encontrado' });
    });

    test('motorista chama /motoristas/{id}', async () => {
        responder(200, { id: 2 });
        const res = await request(app).get('/api/frotas/motoristas/2');
        expect(res.status).toBe(200);
        expect(requisicoes).toEqual(['/api/motoristas/2']);
    });

    test('motorista 404', async () => {
        responder(404, {});
        const res = await request(app).get('/api/frotas/motoristas/2');
        expect(res.body).toEqual({ error: 'Motorista não encontrado' });
    });

    test('erro HTTP do api-frotas vira 502', async () => {
        responder(500, {});
        const res = await request(app).get('/api/frotas/veiculos/ABC1234');
        expect(res.status).toBe(502);
        expect(res.body).toEqual({ error: 'Erro ao comunicar com api-frotas' });
    });

    test('JSON inválido vira 502', async () => {
        responder(200, 'não é json');
        expect((await request(app).get('/api/frotas/veiculos/ABC1234')).status).toBe(502);
    });

    test('listagem com erro responde 502 sem "detalhes"', async () => {
        responder(500, {});
        const res = await request(app).get('/api/frotas/veiculos/disponiveis');
        expect(res.status).toBe(502);
        expect(res.body).toEqual({ error: 'Erro ao comunicar com api-frotas' });
    });

    test('disponibilidade: ATIVO, inativo e inexistente', async () => {
        responder(200, { placa: 'A', status: 'ATIVO' });
        expect((await request(app).get('/api/frotas/veiculos/A/disponibilidade')).body)
            .toEqual({ disponivel: true, veiculo: { placa: 'A', status: 'ATIVO' } });

        responder(200, { placa: 'A', status: 'MANUTENCAO' });
        expect((await request(app).get('/api/frotas/veiculos/A/disponibilidade')).body)
            .toEqual({ disponivel: false, motivo: 'Veículo com status: MANUTENCAO' });

        responder(404, {});
        expect((await request(app).get('/api/frotas/veiculos/A/disponibilidade')).body)
            .toEqual({ disponivel: false, motivo: 'Veículo não encontrado' });
    });

    test('placa é codificada na URL', async () => {
        responder(404, {});
        await request(app).get('/api/frotas/veiculos/' + encodeURIComponent('A B/1'));
        expect(requisicoes).toEqual(['/api/veiculos/placa/A%20B%2F1']);
    });

    test('api-frotas lenta vira 502 dentro do timeout', async () => {
        const antes = process.env.HTTP_TIMEOUT_MS;
        const antesR = process.env.HTTP_RETRIES;
        process.env.HTTP_TIMEOUT_MS = '150';
        process.env.HTTP_RETRIES = '0';
        handler = () => {};
        const inicio = Date.now();
        const res = await request(app).get('/api/frotas/motoristas/2');
        process.env.HTTP_TIMEOUT_MS = antes === undefined ? '' : antes;
        process.env.HTTP_RETRIES = antesR === undefined ? '' : antesR;
        expect(res.status).toBe(502);
        expect(Date.now() - inicio).toBeLessThan(2000);
    });

    test('api-frotas fora do ar vira 502', async () => {
        await new Promise((r) => server.close(r));
        const res = await request(app).get('/api/frotas/motoristas/2');
        expect(res.status).toBe(502);
    });
});
