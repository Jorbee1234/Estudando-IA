import { mapearPedido } from '../domain/mappers';
import type { Entrega } from '../domain/tipos';
import { ApiError } from './ApiError';
import { getJson } from './httpClient';

/**
 * Busca pública por número do pedido. `404` significa "pedido não encontrado"
 * e é tratado só aqui: devolve `null` em vez de erro. Qualquer outra falha propaga.
 * Pedido sem eventos responde `200` com `eventos: []`.
 */
export async function buscarPorPedido(numero: string, signal?: AbortSignal): Promise<Entrega | null> {
  try {
    return mapearPedido(await getJson(`/api/rastreamento/pedido/${encodeURIComponent(numero)}`, { signal }));
  } catch (erro) {
    if (erro instanceof ApiError && erro.status === 404) return null;
    throw erro;
  }
}
