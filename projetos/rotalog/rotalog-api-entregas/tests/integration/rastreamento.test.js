jest.mock('../../src/models', () => require('../helpers/mockModels').build());
jest.mock('../../src/config/database', () => ({ sequelize: {}, testConnection: jest.fn() }));

const request = require('supertest');
const app = require('../../src/app');
const { Entrega, Rastreamento } = require('../../src/models');

beforeEach(() => jest.clearAllMocks());

describe('GET /api/rastreamento/:entregaId', () => {
    test('lista eventos', async () => {
        Rastreamento.porEntrega.mockResolvedValue([{ id: 1 }]);
        const res = await request(app).get('/api/rastreamento/1');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 1 }]);
    });

    // Contrato com o portal de rastreamento: 404 (e não []) quando não há eventos.
    test('sem eventos responde 404', async () => {
        Rastreamento.porEntrega.mockResolvedValue([]);
        const res = await request(app).get('/api/rastreamento/1');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Nenhum evento de rastreamento encontrado' });
    });
});

describe('GET /api/rastreamento/:entregaId/ultimo', () => {
    test('encontrado e 404', async () => {
        Rastreamento.findOne.mockResolvedValueOnce({ id: 5 }).mockResolvedValueOnce(null);
        expect((await request(app).get('/api/rastreamento/1/ultimo')).status).toBe(200);
        const res = await request(app).get('/api/rastreamento/1/ultimo');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Nenhum evento encontrado' });
    });
});

describe('GET /api/rastreamento/pedido/:numeroPedido', () => {
    test('retorna resumo + eventos', async () => {
        Entrega.findOne.mockResolvedValue({
            id: 1, numero_pedido: 'PED-1', status: 'PENDENTE',
            origem_endereco: 'A', destino_endereco: 'B',
            origem_lat: '-23.5', origem_lng: '-46.6', destino_lat: '-23.6', destino_lng: '-46.7',
            distancia_km: '12.50', tempo_estimado_minutos: 30,
            motorista_nome: 'João', veiculo_placa: 'ABC1D23'
        });
        Rastreamento.porEntrega.mockResolvedValue([{ id: 1 }]);
        const res = await request(app).get('/api/rastreamento/pedido/PED-1');
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ pedido: 'PED-1', status: 'PENDENTE', origem: 'A', destino: 'B', eventos: [{ id: 1 }] });
        expect(res.body).toMatchObject({ origem_lat: '-23.5', destino_lng: '-46.7', distancia_km: '12.50', tempo_estimado_minutos: 30 });
    });

    test('não expõe motorista nem placa', async () => {
        Entrega.findOne.mockResolvedValue({ id: 1, numero_pedido: 'PED-1', status: 'PENDENTE', origem_endereco: 'A', destino_endereco: 'B', motorista_nome: 'João', veiculo_placa: 'ABC1D23' });
        Rastreamento.porEntrega.mockResolvedValue([]);
        const res = await request(app).get('/api/rastreamento/pedido/PED-1');
        expect(res.body).not.toHaveProperty('motorista_nome');
        expect(res.body).not.toHaveProperty('veiculo_placa');
    });

    test('404', async () => {
        Entrega.findOne.mockResolvedValue(null);
        const res = await request(app).get('/api/rastreamento/pedido/X');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Pedido não encontrado' });
    });
});

describe('POST /api/rastreamento/:entregaId', () => {
    test('sem autenticação, grava evento com defaults', async () => {
        Entrega.findByPk.mockResolvedValue({ id: 1 });
        Rastreamento.create.mockImplementation(async (d) => d);
        const res = await request(app).post('/api/rastreamento/1').send({ latitude: -23.5, longitude: -46.6 });
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ evento: 'POSICAO_ATUALIZADA', latitude: -23.5, longitude: -46.6 });
    });

    test('coordenada 0 é aceita e gravada como 0', async () => {
        Entrega.findByPk.mockResolvedValue({ id: 1 });
        Rastreamento.create.mockImplementation(async (d) => d);
        const res = await request(app).post('/api/rastreamento/1').send({ latitude: 0, longitude: 0 });
        expect(res.status).toBe(201);
        expect(res.body.latitude).toBe(0);
        expect(res.body.longitude).toBe(0);
    });

    test('sem coordenadas grava null', async () => {
        Entrega.findByPk.mockResolvedValue({ id: 1 });
        Rastreamento.create.mockImplementation(async (d) => d);
        const res = await request(app).post('/api/rastreamento/1').send({ evento: 'PARADA' });
        expect(res.body).toMatchObject({ latitude: null, longitude: null, evento: 'PARADA' });
    });

    test.each([
        ['latitude fora do intervalo', { latitude: 91 }, 'Latitude inválida'],
        ['longitude não numérica', { longitude: 'abc' }, 'Longitude inválida'],
        ['evento longo demais', { evento: 'x'.repeat(51) }, 'Evento deve ter no máximo 50 caracteres'],
        ['evento não string', { evento: 5 }, 'Evento deve ter no máximo 50 caracteres'],
        ['descrição longa demais', { descricao: 'x'.repeat(2001) }, 'Descrição deve ter no máximo 2000 caracteres']
    ])('%s responde 400 sem consultar o banco', async (nome, corpo, mensagem) => {
        const res = await request(app).post('/api/rastreamento/1').send(corpo);
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: mensagem });
        expect(Entrega.findByPk).not.toHaveBeenCalled();
    });

    test('ID da entrega não numérico responde 400 nas quatro rotas de :entregaId', async () => {
        expect((await request(app).get('/api/rastreamento/abc')).status).toBe(400);
        expect((await request(app).get('/api/rastreamento/abc/ultimo')).status).toBe(400);
        const res = await request(app).post('/api/rastreamento/abc').send({});
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'ID da entrega inválido' });
    });

    test('entrega inexistente: 404', async () => {
        Entrega.findByPk.mockResolvedValue(null);
        const res = await request(app).post('/api/rastreamento/1').send({});
        expect(res.status).toBe(404);
    });
});
