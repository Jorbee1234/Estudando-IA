// Usa o model real: o Sequelize é instanciado, mas nenhuma conexão é aberta.
const asyncHandler = require('../../src/middleware/asyncHandler');
const { STATUS, STATUS_VALIDOS } = require('../../src/constants/status');
const Rastreamento = require('../../src/models/Rastreamento');
const { proxyFrotas } = require('../../src/controllers/frotasController');

function resFake() {
    const res = { headersSent: false };
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}

describe('constants/status', () => {
    test('ordem de STATUS_VALIDOS é a do contrato', () => {
        expect(STATUS_VALIDOS).toEqual(['PENDENTE', 'ATRIBUIDA', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA']);
        expect(STATUS.ENTREGUE).toBe('ENTREGUE');
    });
});

describe('asyncHandler', () => {
    const req = { method: 'GET', route: { path: '/x' } };

    test('erro vira 500 com a mensagem configurada, sem detalhes por padrão', async () => {
        const res = resFake();
        asyncHandler(async () => { throw new Error('interno'); }, { mensagem: 'Falhou' })(req, res, jest.fn());
        await new Promise((r) => setImmediate(r));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Falhou' });
    });

    test('mensagem padrão e a mensagem interna nunca vai para o cliente', async () => {
        const res = resFake();
        asyncHandler(async () => { throw new Error('segredo interno'); })(req, res, jest.fn());
        await new Promise((r) => setImmediate(r));
        expect(res.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
    });

    test('handler síncrono que lança também é capturado', async () => {
        const res = resFake();
        asyncHandler(() => { throw new Error('s'); })(req, res, jest.fn());
        await new Promise((r) => setImmediate(r));
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test('com resposta já enviada, delega ao next', async () => {
        const res = resFake();
        res.headersSent = true;
        const next = jest.fn();
        asyncHandler(async () => { throw new Error('tarde'); })(req, res, next);
        await new Promise((r) => setImmediate(r));
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});

describe('Rastreamento.porEntrega', () => {
    test('consulta por entrega, mais recente primeiro', async () => {
        const spy = jest.spyOn(Rastreamento, 'findAll').mockResolvedValue([]);
        await Rastreamento.porEntrega(5);
        expect(spy).toHaveBeenCalledWith({ where: { entrega_id: 5 }, order: [['data_evento', 'DESC']] });
    });
});

describe('proxyFrotas', () => {
    test('resultado vazio com naoEncontrado vira 404', async () => {
        const res = resFake();
        proxyFrotas(async () => null, { naoEncontrado: 'Nada' })({}, res);
        await new Promise((r) => setImmediate(r));
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Nada' });
    });

    test('falha vira 502 sem expor a mensagem interna', async () => {
        const res = resFake();
        proxyFrotas(async () => { throw new Error('boom'); })({}, res);
        await new Promise((r) => setImmediate(r));
        expect(res.status).toHaveBeenCalledWith(502);
        expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao comunicar com api-frotas' });
    });
});
