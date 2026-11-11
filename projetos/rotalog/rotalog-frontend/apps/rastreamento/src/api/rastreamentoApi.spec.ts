import { jsonResponse, pedido } from '../test/fixtures';
import { ApiError } from './ApiError';
import { buscarPorPedido } from './rastreamentoApi';

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
});

describe('buscarPorPedido', () => {
  it('usa /rastreamento/pedido/:numero (e nunca /api/entregas) com o número codificado', async () => {
    fetchMock.mockReturnValue(jsonResponse(pedido()));
    const e = await buscarPorPedido('PED 001/x');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/api/rastreamento/pedido/PED%20001%2Fx');
    expect(e?.distancia_km).toBe(12.5);
  });

  it('404 vira null (pedido não encontrado), sem erro', async () => {
    fetchMock.mockReturnValue(jsonResponse({ error: 'Pedido não encontrado' }, 404));
    await expect(buscarPorPedido('X')).resolves.toBeNull();
  });

  it('pedido sem eventos (200 com eventos: []) é válido', async () => {
    fetchMock.mockReturnValue(jsonResponse(pedido({ status: 'PENDENTE', eventos: [] })));
    await expect(buscarPorPedido('X')).resolves.toMatchObject({ rastreamentos: [] });
  });

  it.each([429, 500])('status %i continua sendo erro', async (status) => {
    fetchMock.mockReturnValue(jsonResponse({ error: 'ruim' }, status));
    await expect(buscarPorPedido('X')).rejects.toBeInstanceOf(ApiError);
  });
});
