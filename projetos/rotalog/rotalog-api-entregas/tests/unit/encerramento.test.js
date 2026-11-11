const { criarEncerramento } = require('../../src/utils/encerramento');

function montar(opcoes) {
    const o = opcoes || {};
    const servidor = o.semServidor ? null : {
        close: jest.fn((cb) => cb(o.erroClose)),
        closeIdleConnections: jest.fn()
    };
    const deps = {
        logger: { info: jest.fn(), error: jest.fn() },
        timeoutMs: o.timeoutMs || 5000,
        obterServidor: () => servidor,
        fecharBanco: o.fecharBanco || jest.fn().mockResolvedValue(),
        sair: jest.fn()
    };
    return { deps, servidor, encerrar: criarEncerramento(deps) };
}

const aguardar = () => new Promise((r) => setImmediate(r));

test('fecha o servidor, depois o pool, depois sai com o código pedido', async () => {
    const { deps, servidor, encerrar } = montar();
    encerrar('SIGTERM', 0);
    await aguardar();
    expect(servidor.close).toHaveBeenCalled();
    expect(servidor.closeIdleConnections).toHaveBeenCalled();
    expect(deps.fecharBanco).toHaveBeenCalled();
    expect(deps.sair).toHaveBeenCalledWith(0);
});

test('só a primeira chamada vale', async () => {
    const { deps, servidor, encerrar } = montar();
    encerrar('SIGTERM', 0);
    encerrar('uncaughtException', 1);
    await aguardar();
    expect(servidor.close).toHaveBeenCalledTimes(1);
    expect(deps.sair).toHaveBeenCalledTimes(1);
    expect(deps.sair).toHaveBeenCalledWith(0);
});

test('sem servidor (falha na subida) ainda fecha o pool e sai com o código', async () => {
    const { deps, encerrar } = montar({ semServidor: true });
    encerrar('falha na subida', 1);
    await aguardar();
    expect(deps.fecharBanco).toHaveBeenCalled();
    expect(deps.sair).toHaveBeenCalledWith(1);
});

test('erro ao fechar o pool é logado e a saída acontece mesmo assim', async () => {
    const { deps, encerrar } = montar({ fecharBanco: jest.fn().mockRejectedValue(new Error('x')) });
    encerrar('SIGINT', 0);
    await aguardar();
    expect(deps.logger.error).toHaveBeenCalled();
    expect(deps.sair).toHaveBeenCalledWith(0);
});

test('erro ao fechar o servidor sai com código 1', async () => {
    const { deps, encerrar } = montar({ erroClose: new Error('não estava ouvindo') });
    encerrar('SIGTERM', 0);
    await aguardar();
    expect(deps.sair).toHaveBeenCalledWith(1);
});

test('servidor que não fecha: sai com 1 após o timeout', () => {
    jest.useFakeTimers();
    const { deps, servidor, encerrar } = montar({ timeoutMs: 1000 });
    servidor.close.mockImplementation(() => {});
    encerrar('SIGTERM', 0);
    expect(deps.sair).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(deps.sair).toHaveBeenCalledWith(1);
    jest.useRealTimers();
});
