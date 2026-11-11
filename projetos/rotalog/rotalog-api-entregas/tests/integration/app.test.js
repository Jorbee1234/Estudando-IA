jest.mock('../../src/models', () => require('../helpers/mockModels').build());
jest.mock('../../src/config/database', () => ({ sequelize: {}, testConnection: jest.fn() }));

const request = require('supertest');
const app = require('../../src/app');
const { Entrega } = require('../../src/models');

describe('404 de rota, CORS, helmet e erros', () => {
    test('rota inexistente: 404 com path e method', async () => {
        const res = await request(app).get('/api/nada');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Rota não encontrada', path: '/api/nada', method: 'GET' });
    });

    test.each(['http://localhost:4200', 'http://localhost:3001'])('CORS libera a origem %s', async (origem) => {
        const res = await request(app).get('/api/nada').set('Origin', origem);
        expect(res.headers['access-control-allow-origin']).toBe(origem);
    });

    test('CORS não libera origem desconhecida', async () => {
        const res = await request(app).get('/api/nada').set('Origin', 'http://malicioso.example');
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    test('preflight OPTIONS responde 200 com métodos e headers permitidos', async () => {
        const res = await request(app).options('/api/entregas')
            .set('Origin', 'http://localhost:4200')
            .set('Access-Control-Request-Method', 'PATCH')
            .set('Access-Control-Request-Headers', 'Authorization, Content-Type');
        expect(res.status).toBe(200);
        expect(res.headers['access-control-allow-methods']).toMatch(/PATCH/);
        expect(res.headers['access-control-allow-headers']).toMatch(/Authorization/);
    });

    test('CORS_ORIGINS configurável e "*" libera qualquer origem', async () => {
        const antes = process.env.CORS_ORIGINS;
        process.env.CORS_ORIGINS = 'http://outro.example';
        const a = await request(app).get('/api/nada').set('Origin', 'http://outro.example');
        const b = await request(app).get('/api/nada').set('Origin', 'http://localhost:4200');
        process.env.CORS_ORIGINS = '*';
        const c = await request(app).get('/api/nada').set('Origin', 'http://qualquer.example');
        if (antes === undefined) delete process.env.CORS_ORIGINS; else process.env.CORS_ORIGINS = antes;
        expect(a.headers['access-control-allow-origin']).toBe('http://outro.example');
        expect(b.headers['access-control-allow-origin']).toBeUndefined();
        expect(c.headers['access-control-allow-origin']).toBe('http://qualquer.example');
    });

    test('helmet: headers de segurança e sem x-powered-by', async () => {
        const res = await request(app).get('/api/nada');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-powered-by']).toBeUndefined();
    });

    test('body acima do limite responde 413', async () => {
        const res = await request(app).post('/api/entregas')
            .send({ origem_endereco: 'A', destino_endereco: 'B', observacoes: 'x'.repeat(200 * 1024) });
        expect(res.status).toBe(413);
        expect(res.body.stack).toBeUndefined();
    });

    test('JSON malformado: 400 sem stack', async () => {
        const res = await request(app).post('/api/entregas')
            .set('Content-Type', 'application/json').send('{ruim');
        expect(res.status).toBe(400);
        expect(res.body.error).toBeDefined();
        expect(res.body.stack).toBeUndefined();
    });
});

describe('autenticação', () => {
    const original = process.env.NODE_ENV;
    afterEach(() => { process.env.NODE_ENV = original; });

    test('fora de produção: bypass, sem token', async () => {
        Entrega.findAll.mockResolvedValue([]);
        expect((await request(app).get('/api/entregas')).status).toBe(200);
    });

    test('NODE_ENV vazio também libera', async () => {
        process.env.NODE_ENV = '';
        Entrega.findAll.mockResolvedValue([]);
        expect((await request(app).get('/api/entregas')).status).toBe(200);
    });

    describe('em produção', () => {
        beforeEach(() => { process.env.NODE_ENV = 'production'; Entrega.findAll.mockResolvedValue([]); });

        test('sem token: 401', async () => {
            const res = await request(app).get('/api/entregas');
            expect(res.status).toBe(401);
            expect(res.body).toEqual({ error: 'Token não fornecido' });
        });

        test('mal formado: 401', async () => {
            const res = await request(app).get('/api/entregas').set('Authorization', 'Token abc');
            expect(res.body).toEqual({ error: 'Token mal formatado' });
        });

        test('curto: 401', async () => {
            const res = await request(app).get('/api/entregas').set('Authorization', 'Bearer curto');
            expect(res.body).toEqual({ error: 'Token inválido' });
        });

        test('qualquer Bearer com 10+ caracteres é aceito (sem validar assinatura)', async () => {
            const res = await request(app).get('/api/entregas').set('Authorization', 'Bearer 0123456789');
            expect(res.status).toBe(200);
        });

        test('/api/rastreamento segue sem auth (o health também: ver health.test.js)', async () => {
            const { Rastreamento } = require('../../src/models');
            Rastreamento.porEntrega.mockResolvedValue([{ id: 1 }]);
            expect((await request(app).get('/api/rastreamento/1')).status).toBe(200);
        });
    });
});
