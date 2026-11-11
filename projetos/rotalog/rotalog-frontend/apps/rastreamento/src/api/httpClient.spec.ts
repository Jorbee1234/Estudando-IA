import { jsonResponse } from '../test/fixtures';
import { ApiError } from './ApiError';
import { getJson } from './httpClient';

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn();
  (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
});
afterEach(() => jest.useRealTimers());

describe('getJson', () => {
  it('sucesso devolve o JSON e usa a URL configurada', async () => {
    fetchMock.mockReturnValue(jsonResponse([1]));
    await expect(getJson('/api/entregas')).resolves.toEqual([1]);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/api/entregas');
  });

  it.each([404, 500])('status %i vira ApiError com a mensagem da API', async (status) => {
    fetchMock.mockReturnValue(jsonResponse({ error: 'ruim' }, status));
    await expect(getJson('/x')).rejects.toMatchObject({ name: 'ApiError', status, message: 'ruim' });
  });

  it('JSON inválido vira ApiError', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: () => Promise.reject(new SyntaxError('x')) });
    await expect(getJson('/x')).rejects.toBeInstanceOf(ApiError);
  });

  it('falha de rede vira ApiError', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(getJson('/x')).rejects.toBeInstanceOf(ApiError);
  });

  it('timeout aborta a requisição e vira ApiError', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_u: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_r, rej) => signal.addEventListener('abort', () => rej(new DOMException('abort', 'AbortError')))),
    );
    const p = getJson('/x', { timeoutMs: 100 });
    const assercao = expect(p).rejects.toThrow(/demorou/);
    await jest.advanceTimersByTimeAsync(150);
    await assercao;
  });

  it('cancelamento externo propaga o abort (não vira erro de API)', async () => {
    const controlador = new AbortController();
    fetchMock.mockImplementation(
      (_u: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_r, rej) => signal.addEventListener('abort', () => rej(new DOMException('abort', 'AbortError')))),
    );
    const p = getJson('/x', { signal: controlador.signal });
    controlador.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
  });
});
