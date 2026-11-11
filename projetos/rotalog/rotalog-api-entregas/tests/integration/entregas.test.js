// Testes de CARACTERIZAÇÃO: fixam o comportamento atual, inclusive o "errado".
jest.mock('../../src/models', () => require('../helpers/mockModels').build());
jest.mock('../../src/config/database', () => ({
    sequelize: require('../helpers/mockModels').build_sequelize().sequelize,
    testConnection: jest.fn()
}));

const request = require('supertest');
const app = require('../../src/app');
const { Entrega, Rastreamento } = require('../../src/models');
const { sequelize } = require('../../src/config/database');
const { entregaFake } = require('../helpers/mockModels');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/entregas', () => {
    test('lista como array puro', async () => {
        Entrega.findAll.mockResolvedValue([{ id: 1 }]);
        const res = await request(app).get('/api/entregas');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 1 }]);
    });

    test('filtros veiculo, status (maiúsculo) e motorista_id', async () => {
        Entrega.findAll.mockResolvedValue([]);
        await request(app).get('/api/entregas?veiculo=ABC1234&status=pendente&motorista_id=7');
        expect(Entrega.findAll.mock.calls[0][0].where).toEqual({
            veiculo_placa: 'ABC1234', status: 'PENDENTE', motorista_id: '7'
        });
    });

    test('status repetido na query (array) responde 400', async () => {
        const res = await request(app).get('/api/entregas?status=a&status=b');
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'Status inválido' });
        expect(Entrega.findAll).not.toHaveBeenCalled();
    });

    test('motorista_id não numérico responde 400', async () => {
        const res = await request(app).get('/api/entregas?motorista_id=abc');
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'Motorista inválido' });
    });
});

describe('GET /api/entregas/:id e /pedido/:numero', () => {
    test('encontrada', async () => {
        Entrega.findByPk.mockResolvedValue({ id: 3 });
        const res = await request(app).get('/api/entregas/3');
        expect(res.status).toBe(200);
    });

    test('404', async () => {
        Entrega.findByPk.mockResolvedValue(null);
        const res = await request(app).get('/api/entregas/3');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Entrega não encontrada' });
    });

    test('id não numérico responde 400 sem consultar o banco', async () => {
        const res = await request(app).get('/api/entregas/abc');
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'ID inválido' });
        expect(Entrega.findByPk).not.toHaveBeenCalled();
    });

    test('id numérico é repassado como string', async () => {
        Entrega.findByPk.mockResolvedValue(null);
        await request(app).get('/api/entregas/42');
        expect(Entrega.findByPk.mock.calls[0][0]).toBe('42');
    });

    test('pedido encontrado e 404', async () => {
        Entrega.findOne.mockResolvedValueOnce({ id: 1 }).mockResolvedValueOnce(null);
        expect((await request(app).get('/api/entregas/pedido/PED-1')).status).toBe(200);
        const res = await request(app).get('/api/entregas/pedido/PED-2');
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: 'Pedido não encontrado' });
    });
});

describe('POST /api/entregas', () => {
    test('sucesso: gera numero_pedido, distância e evento inicial', async () => {
        Entrega.create.mockImplementation(async (d) => Object.assign({ id: 9 }, d));
        Rastreamento.create.mockResolvedValue({});
        const res = await request(app).post('/api/entregas').send({
            origem_endereco: 'A', destino_endereco: 'B',
            origem_lat: 1, origem_lng: 1, destino_lat: 2, destino_lng: 1
        });
        expect(res.status).toBe(201);
        expect(res.body.numero_pedido).toMatch(/^PED-\d+-\d{1,3}$/);
        expect(res.body.status).toBe('PENDENTE');
        expect(res.body.distancia_km).toBeCloseTo(111);
        expect(res.body.tempo_estimado_minutos).toBe(222);
        expect(Rastreamento.create.mock.calls[0][0]).toMatchObject({ entrega_id: 9, evento: 'PEDIDO_CRIADO' });
    });

    test('sem origem ou destino: 400', async () => {
        const res = await request(app).post('/api/entregas').send({ origem_endereco: 'A' });
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'Endereços de origem e destino são obrigatórios' });
    });

    test('coordenada 0 é aceita e entra no cálculo da distância', async () => {
        Entrega.create.mockImplementation(async (d) => Object.assign({ id: 9 }, d));
        Rastreamento.create.mockResolvedValue({});
        const res = await request(app).post('/api/entregas').send({
            origem_endereco: 'A', destino_endereco: 'B',
            origem_lat: 0, origem_lng: 0, destino_lat: 1, destino_lng: 1
        });
        expect(res.status).toBe(201);
        expect(res.body.origem_lat).toBe(0);
        expect(res.body.origem_lng).toBe(0);
        expect(res.body.distancia_km).toBeCloseTo(Math.sqrt(2) * 111);
    });

    test('coordenadas e peso em string numérica são convertidos', async () => {
        Entrega.create.mockImplementation(async (d) => Object.assign({ id: 9 }, d));
        Rastreamento.create.mockResolvedValue({});
        const res = await request(app).post('/api/entregas').send({
            origem_endereco: 'A', destino_endereco: 'B', origem_lat: '-23.5', peso_kg: '12.5'
        });
        expect(res.body.origem_lat).toBe(-23.5);
        expect(res.body.peso_kg).toBe(12.5);
    });

    test.each([
        ['peso não numérico', { peso_kg: 'abc' }, 'Peso deve ser um número positivo'],
        ['peso zero', { peso_kg: 0 }, 'Peso deve ser um número positivo'],
        ['peso negativo', { peso_kg: -1 }, 'Peso deve ser um número positivo'],
        ['latitude fora do intervalo', { origem_lat: 91 }, 'Latitude de origem inválida'],
        ['longitude fora do intervalo', { destino_lng: -181 }, 'Longitude de destino inválida'],
        ['latitude não numérica', { destino_lat: 'x' }, 'Latitude de destino inválida'],
        ['endereço não string', { origem_endereco: 5 }, 'Endereços de origem e destino são obrigatórios'],
        ['endereço longo demais', { destino_endereco: 'x'.repeat(256) }, 'Endereço deve ter no máximo 255 caracteres'],
        ['observações longas demais', { observacoes: 'x'.repeat(5001) }, 'Observações devem ter no máximo 5000 caracteres']
    ])('%s responde 400 sem gravar', async (nome, extra, mensagem) => {
        const res = await request(app).post('/api/entregas')
            .send(Object.assign({ origem_endereco: 'A', destino_endereco: 'B' }, extra));
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: mensagem });
        expect(Entrega.create).not.toHaveBeenCalled();
    });

    test('erro interno não devolve "detalhes"', async () => {
        Entrega.create.mockRejectedValue(new Error('boom'));
        const res = await request(app).post('/api/entregas')
            .send({ origem_endereco: 'A', destino_endereco: 'B' });
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Erro ao criar entrega' });
    });
});

describe('PUT /api/entregas/:id', () => {
    test('sucesso', async () => {
        const e = entregaFake();
        Entrega.findByPk.mockResolvedValue(e);
        const res = await request(app).put('/api/entregas/1').send({ origem_endereco: 'Novo', peso_kg: 5 });
        expect(res.status).toBe(200);
        expect(e.origem_endereco).toBe('Novo');
        expect(e.peso_kg).toBe(5);
        expect(e.save).toHaveBeenCalled();
    });

    test('404', async () => {
        Entrega.findByPk.mockResolvedValue(null);
        const res = await request(app).put('/api/entregas/1').send({});
        expect(res.status).toBe(404);
    });
});

describe('PATCH /api/entregas/:id/status', () => {
    test('status válido salva e registra evento', async () => {
        const e = entregaFake();
        Entrega.findByPk.mockResolvedValue(e);
        Rastreamento.create.mockResolvedValue({});
        const res = await request(app).patch('/api/entregas/1/status').send({ status: 'EM_TRANSITO' });
        expect(res.status).toBe(200);
        expect(e.data_coleta).toBeInstanceOf(Date);
        expect(Rastreamento.create.mock.calls[0][0]).toMatchObject({
            evento: 'STATUS_ALTERADO',
            descricao: 'Status alterado de PENDENTE para EM_TRANSITO'
        });
    });

    test('status inválido devolve statusValidos', async () => {
        Entrega.findByPk.mockResolvedValue(entregaFake());
        const res = await request(app).patch('/api/entregas/1/status').send({ status: 'X' });
        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: 'Status inválido',
            statusValidos: ['PENDENTE', 'ATRIBUIDA', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA']
        });
    });

    test('ENTREGUE -> PENDENTE é aceito (sem máquina de estados)', async () => {
        const e = entregaFake({ status: 'ENTREGUE' });
        Entrega.findByPk.mockResolvedValue(e);
        Rastreamento.create.mockResolvedValue({});
        const res = await request(app).patch('/api/entregas/1/status').send({ status: 'PENDENTE' });
        expect(res.status).toBe(200);
        expect(e.status).toBe('PENDENTE');
    });

    test('save e evento usam a mesma transação', async () => {
        const e = entregaFake();
        Entrega.findByPk.mockResolvedValue(e);
        Rastreamento.create.mockResolvedValue({});
        await request(app).patch('/api/entregas/1/status').send({ status: 'ENTREGUE' });
        const tx = e.save.mock.calls[0][0].transaction;
        expect(tx).toBeDefined();
        expect(Rastreamento.create.mock.calls[0][1]).toEqual({ transaction: tx });
        expect(tx.rolledBack).toBeUndefined();
    });

    test('falha no Rastreamento.create desfaz a transação e responde 500', async () => {
        const e = entregaFake();
        Entrega.findByPk.mockResolvedValue(e);
        Rastreamento.create.mockRejectedValue(new Error('x'));
        const res = await request(app).patch('/api/entregas/1/status').send({ status: 'ENTREGUE' });
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Erro ao atualizar status' });
        expect(e.save.mock.calls[0][0].transaction.rolledBack).toBe(true);
    });

    test('falha na consulta da entrega usa a mensagem da rota', async () => {
        Entrega.findByPk.mockRejectedValue(new Error('db'));
        const res = await request(app).patch('/api/entregas/1/status').send({ status: 'ENTREGUE' });
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: 'Erro ao atualizar status' });
    });
});

describe('PATCH /api/entregas/:id/atribuir', () => {
    test('sucesso', async () => {
        const e = entregaFake();
        Entrega.findByPk.mockResolvedValue(e);
        Rastreamento.create.mockResolvedValue({});
        const res = await request(app).patch('/api/entregas/1/atribuir')
            .send({ veiculo_placa: 'ABC1234', motorista_id: 2 });
        expect(res.status).toBe(200);
        expect(e.status).toBe('ATRIBUIDA');
        expect(e.motorista_nome).toBeNull();
    });

    test.each([
        ['sem motorista', { veiculo_placa: 'X' }],
        ['sem placa', { motorista_id: 2 }],
        ['motorista_id zero', { veiculo_placa: 'X', motorista_id: 0 }],
        ['motorista_id nulo', { veiculo_placa: 'X', motorista_id: null }],
        ['motorista_id não numérico', { veiculo_placa: 'X', motorista_id: 'abc' }]
    ])('campos faltando ou inválidos (%s): 400', async (nome, corpo) => {
        Entrega.findByPk.mockResolvedValue(entregaFake());
        const res = await request(app).patch('/api/entregas/1/atribuir').send(corpo);
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: 'Placa do veículo e ID do motorista são obrigatórios' });
    });

    test('placa com mais de 7 caracteres: 400', async () => {
        Entrega.findByPk.mockResolvedValue(entregaFake());
        const res = await request(app).patch('/api/entregas/1/atribuir')
            .send({ veiculo_placa: 'ABCDEFGH', motorista_id: 1 });
        expect(res.status).toBe(400);
    });

    test('motorista_id em string numérica é convertido', async () => {
        const e = entregaFake();
        Entrega.findByPk.mockResolvedValue(e);
        Rastreamento.create.mockResolvedValue({});
        await request(app).patch('/api/entregas/1/atribuir').send({ veiculo_placa: 'ABC1234', motorista_id: '7' });
        expect(e.motorista_id).toBe(7);
    });

    test('404 vem antes da validação de campos', async () => {
        Entrega.findByPk.mockResolvedValue(null);
        const res = await request(app).patch('/api/entregas/1/atribuir').send({});
        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/entregas/:id', () => {
    test('cancela', async () => {
        const e = entregaFake();
        Entrega.findByPk.mockResolvedValue(e);
        Rastreamento.create.mockResolvedValue({});
        const res = await request(app).delete('/api/entregas/1');
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Entrega cancelada');
        expect(e.status).toBe('CANCELADA');
    });

    test('cancela mesmo uma entrega já ENTREGUE', async () => {
        const e = entregaFake({ status: 'ENTREGUE' });
        Entrega.findByPk.mockResolvedValue(e);
        Rastreamento.create.mockResolvedValue({});
        const res = await request(app).delete('/api/entregas/1');
        expect(res.status).toBe(200);
        expect(e.status).toBe('CANCELADA');
    });

    test('404', async () => {
        Entrega.findByPk.mockResolvedValue(null);
        expect((await request(app).delete('/api/entregas/1')).status).toBe(404);
    });
});

describe('GET /api/entregas/stats', () => {
    test('totais por status', async () => {
        sequelize.query.mockResolvedValue([
            { status: 'PENDENTE', total: '2' }, { status: 'ENTREGUE', total: '3' }
        ]);
        const res = await request(app).get('/api/entregas/stats');
        expect(res.status).toBe(200);
        expect(res.body.total).toBe(5);
        expect(res.body.por_status).toHaveLength(2);
        expect(res.body.gerado_em).toBeDefined();
    });
});
