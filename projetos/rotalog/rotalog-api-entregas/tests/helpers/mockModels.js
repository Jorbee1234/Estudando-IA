// Fábrica dos mocks de models usada pelos testes de integração HTTP.
// Uso: jest.mock('../../src/models', () => require('../helpers/mockModels').build());

function build() {
    return {
        Entrega: {
            findAll: jest.fn(),
            findByPk: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn()
        },
        Rastreamento: {
            porEntrega: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn()
        }
    };
}

function entregaFake(overrides) {
    const e = Object.assign({
        id: 1,
        numero_pedido: 'PED-1-1',
        status: 'PENDENTE',
        origem_endereco: 'A',
        destino_endereco: 'B'
    }, overrides);
    e.save = jest.fn().mockResolvedValue(e);
    return e;
}

// Imita sequelize.transaction(callback): rejeitar o callback equivale a rollback.
function build_sequelize() {
    return {
        sequelize: {
            query: jest.fn(),
            constructor: { QueryTypes: { SELECT: 'SELECT' } },
            transaction: jest.fn(async (cb) => {
                const tx = { id: 'tx' };
                try {
                    return await cb(tx);
                } catch (e) {
                    tx.rolledBack = true;
                    throw e;
                }
            })
        }
    };
}

module.exports = { build, entregaFake, build_sequelize };
