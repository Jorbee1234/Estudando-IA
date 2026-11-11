const entregas = require('../../src/validators/entregas');
const rastreamento = require('../../src/validators/rastreamento');

function erro(schema, entrada) {
    const r = schema.safeParse(entrada);
    return r.success ? null : r.error.issues[0].message;
}

describe('idParams', () => {
    test.each(['1', '42', '123456789012345678'])('aceita %s', (id) => {
        expect(entregas.idParams.safeParse({ id }).success).toBe(true);
    });

    test.each(['abc', '1a', '-1', '1.5', '', ' 1', '1234567890123456789', '1; DROP TABLE x'])('rejeita %p', (id) => {
        expect(erro(entregas.idParams, { id })).toBe('ID inválido');
    });
});

describe('criarBody', () => {
    const base = { origem_endereco: 'A', destino_endereco: 'B' };

    test('coordenadas nos limites e 0 são válidas', () => {
        const r = entregas.criarBody.parse(Object.assign({}, base, {
            origem_lat: 0, origem_lng: 0, destino_lat: -90, destino_lng: 180
        }));
        expect(r).toMatchObject({ origem_lat: 0, origem_lng: 0, destino_lat: -90, destino_lng: 180 });
    });

    test('null equivale a ausente e campos desconhecidos são descartados', () => {
        const r = entregas.criarBody.parse(Object.assign({}, base, { peso_kg: null, status: 'ENTREGUE' }));
        expect(r.peso_kg).toBeNull();
        expect(r.status).toBeUndefined();
    });

    test.each([NaN, Infinity, '1e3', '', true, [], {}])('peso %p é rejeitado', (peso) => {
        expect(erro(entregas.criarBody, Object.assign({}, base, { peso_kg: peso }))).toBe('Peso deve ser um número positivo');
    });
});

describe('statusBody', () => {
    test('aceita os cinco status e rejeita o resto, inclusive minúsculas e tipos errados', () => {
        ['PENDENTE', 'ATRIBUIDA', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADA'].forEach((status) => {
            expect(entregas.statusBody.safeParse({ status }).success).toBe(true);
        });
        [undefined, null, 'pendente', 'X', 1, ['PENDENTE']].forEach((status) => {
            expect(erro(entregas.statusBody, { status })).toBe('Status inválido');
        });
    });
});

describe('atribuirBody', () => {
    test('converte motorista_id em número inteiro positivo', () => {
        expect(entregas.atribuirBody.parse({ veiculo_placa: 'ABC1D23', motorista_id: '5' }).motorista_id).toBe(5);
    });

    test.each([1.5, -1, 0, '0', 'x', null, undefined])('motorista_id %p é rejeitado', (id) => {
        expect(erro(entregas.atribuirBody, { veiculo_placa: 'ABC1D23', motorista_id: id }))
            .toBe('Placa do veículo e ID do motorista são obrigatórios');
    });
});

describe('listarQuery', () => {
    test('aceita filtros vazios e ignora chaves desconhecidas', () => {
        expect(entregas.listarQuery.parse({ status: '', motorista_id: '', x: '1' })).toEqual({ status: '', motorista_id: '' });
    });

    test('valores repetidos (array) são rejeitados', () => {
        expect(erro(entregas.listarQuery, { veiculo: ['a', 'b'] })).toBe('Veículo inválido');
        expect(erro(entregas.listarQuery, { status: ['a', 'b'] })).toBe('Status inválido');
    });
});

describe('rastreamento', () => {
    test('registrarBody aceita corpo vazio e coordenadas 0', () => {
        expect(rastreamento.registrarBody.parse({})).toEqual({});
        expect(rastreamento.registrarBody.parse({ latitude: 0, longitude: '0' })).toEqual({ latitude: 0, longitude: 0 });
    });

    test('pedidoParams limita o tamanho', () => {
        expect(erro(rastreamento.pedidoParams, { numeroPedido: 'x'.repeat(51) })).toBe('Número do pedido inválido');
    });
});
