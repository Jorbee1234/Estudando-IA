process.env.RATE_LIMIT_PEDIDO_MAX = '2';
process.env.RATE_LIMIT_PEDIDO_JANELA_MS = '60000';

jest.mock('../../src/models', () => require('../helpers/mockModels').build());
jest.mock('../../src/config/database', () => ({ sequelize: {}, testConnection: jest.fn() }));

const request = require('supertest');
const app = require('../../src/app');
const { Entrega } = require('../../src/models');

describe('rate limit de GET /api/rastreamento/pedido/:numeroPedido', () => {
    test('responde 429 depois do limite e não afeta as outras rotas', async () => {
        Entrega.findOne.mockResolvedValue(null);
        expect((await request(app).get('/api/rastreamento/pedido/X')).status).toBe(404);
        expect((await request(app).get('/api/rastreamento/pedido/X')).status).toBe(404);
        const bloqueada = await request(app).get('/api/rastreamento/pedido/X');
        expect(bloqueada.status).toBe(429);
        expect(bloqueada.body).toEqual({ error: 'Muitas consultas. Tente novamente em instantes.' });

        const health = await request(app).get('/api/health');
        expect(health.status).not.toBe(429);
    });
});
