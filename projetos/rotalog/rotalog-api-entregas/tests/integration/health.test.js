const http = require('http');

jest.mock('../../src/models', () => require('../helpers/mockModels').build());
jest.mock('../../src/config/database', () => ({
    sequelize: { authenticate: jest.fn() },
    testConnection: jest.fn()
}));

const request = require('supertest');
const { sequelize } = require('../../src/config/database');
const pacote = require('../../package.json');

let frotas;
let notificacoes;
let frotasStatus = 200;
let frotasLento = false;
const chamadas = [];
let app;

function subir(handler) {
    return new Promise((resolve) => {
        const s = http.createServer(handler);
        s.listen(0, () => resolve(s));
    });
}

beforeAll(async () => {
    frotas = await subir((req, res) => {
        chamadas.push('frotas ' + req.url);
        if (frotasLento) return;
        res.writeHead(frotasStatus);
        res.end('{}');
    });
    notificacoes = await subir((req, res) => {
        chamadas.push('notificacoes ' + req.url);
        res.writeHead(200);
        res.end('{}');
    });
    process.env.API_FROTAS_URL = 'http://localhost:' + frotas.address().port + '/api';
    process.env.API_NOTIFICACOES_URL = 'http://localhost:' + notificacoes.address().port;
    process.env.HEALTH_TIMEOUT_MS = '1000';
    app = require('../../src/app');
});

afterAll(() => {
    frotas.closeAllConnections();
    notificacoes.closeAllConnections();
    frotas.close();
    notificacoes.close();
    delete process.env.HEALTH_TIMEOUT_MS;
});

beforeEach(() => {
    chamadas.length = 0;
    frotasStatus = 200;
    frotasLento = false;
    sequelize.authenticate.mockReset();
    sequelize.authenticate.mockResolvedValue();
});

describe('GET /api/health', () => {
    test('tudo no ar: UP em cada dependência, versão do package.json e mesmo formato de corpo', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            service: 'api-entregas',
            status: 'UP',
            timestamp: expect.any(String),
            version: pacote.version,
            dependencies: { database: 'UP', 'api-frotas': 'UP', 'api-notificacoes': 'UP' }
        });
        expect(chamadas.sort()).toEqual(['frotas /api/health', 'notificacoes /api/health']);
    });

    test('banco fora do ar: DOWN e 503', async () => {
        sequelize.authenticate.mockRejectedValue(new Error('refused'));
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(503);
        expect(res.body.status).toBe('DOWN');
        expect(res.body.dependencies).toEqual({ database: 'DOWN', 'api-frotas': 'UP', 'api-notificacoes': 'UP' });
    });

    test('banco travado: DOWN dentro do timeout', async () => {
        sequelize.authenticate.mockReturnValue(new Promise(() => {}));
        const inicio = Date.now();
        const res = await request(app).get('/api/health');
        expect(res.body.dependencies.database).toBe('DOWN');
        expect(Date.now() - inicio).toBeLessThan(4000);
    });

    test('api-frotas respondendo erro: DOWN na dependência, serviço continua UP com 200', async () => {
        frotasStatus = 500;
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('UP');
        expect(res.body.dependencies['api-frotas']).toBe('DOWN');
    });

    test('api-frotas lenta: DOWN dentro do timeout curto', async () => {
        frotasLento = true;
        const inicio = Date.now();
        const res = await request(app).get('/api/health');
        expect(res.body.dependencies['api-frotas']).toBe('DOWN');
        expect(Date.now() - inicio).toBeLessThan(4000);
    });

    test('é pública, mesmo em produção', async () => {
        const antes = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        const res = await request(app).get('/api/health');
        process.env.NODE_ENV = antes;
        expect(res.status).toBe(200);
    });
});
