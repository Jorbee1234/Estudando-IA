const { errorHandler } = require('../../src/middleware/errorHandler');

function resFake() {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
}

const req = { method: 'POST', path: '/api/x', body: { senha: 'segredo' } };

test('erro 4xx mantém a mensagem e nunca devolve stack', () => {
    const res = resFake();
    const err = Object.assign(new Error('JSON inválido'), { status: 400 });
    errorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'JSON inválido' });
});

test('erro 5xx e erro sem status não expõem a mensagem interna', () => {
    const a = resFake();
    const b = resFake();
    errorHandler(Object.assign(new Error('senha do banco'), { status: 503 }), req, a, jest.fn());
    errorHandler(new Error('detalhe interno'), req, b, jest.fn());
    expect(a.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
    expect(b.status).toHaveBeenCalledWith(500);
    expect(b.json).toHaveBeenCalledWith({ error: 'Erro interno do servidor' });
});

test('o log não recebe req.body', () => {
    const logger = require('../../src/utils/logger');
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => {});
    errorHandler(new Error('x'), req, resFake(), jest.fn());
    const registrado = JSON.stringify(spy.mock.calls[0][0]);
    expect(registrado).not.toContain('segredo');
    expect(registrado).not.toContain('senha');
    spy.mockRestore();
});
