import { ApiError } from '../api/ApiError';
import { TipoEvento } from './status';
import { pedidoSchema } from './schemas';
import type { Coordenada, Entrega, EventoRastreamento } from './tipos';

const timestamp = (iso: string | null) => (iso ? new Date(iso).getTime() || 0 : 0);

/** Mais recente primeiro. Devolve uma cópia: nunca ordena no lugar. */
export function ordenarEventos(eventos: readonly EventoRastreamento[]): EventoRastreamento[] {
  return [...eventos].sort((a, b) => timestamp(b.data_evento) - timestamp(a.data_evento));
}

function validar<T>(resultado: { success: true; data: T } | { success: false; error: Error }): T {
  if (!resultado.success) {
    throw new ApiError('Resposta da API fora do formato esperado', { cause: resultado.error });
  }
  return resultado.data;
}

export function mapearPedido(bruto: unknown): Entrega {
  const entrega = validar(pedidoSchema.safeParse(bruto));
  return { ...entrega, rastreamentos: ordenarEventos(entrega.rastreamentos) };
}

export function centroDaEntrega(entrega: Entrega): Coordenada | null {
  if (entrega.destino_lat !== null && entrega.destino_lng !== null) {
    return { lat: entrega.destino_lat, lng: entrega.destino_lng };
  }
  if (entrega.origem_lat !== null && entrega.origem_lng !== null) {
    return { lat: entrega.origem_lat, lng: entrega.origem_lng };
  }
  return null;
}

/** Posições (eventos com coordenadas) em ordem cronológica. */
export type Posicao = EventoRastreamento & { latitude: number; longitude: number };

/** Eventos de posição (com coordenadas) em ordem cronológica. */
export function posicoesDaEntrega(entrega: Entrega): Posicao[] {
  return entrega.rastreamentos
    .filter((e): e is Posicao => e.evento === TipoEvento.POSICAO_ATUALIZADA && e.latitude !== null && e.longitude !== null)
    .sort((a, b) => timestamp(a.data_evento) - timestamp(b.data_evento));
}

export function formatarKm(valor: number | null): string {
  return valor === null ? '—' : `${valor} km`;
}

export function formatarMinutos(valor: number | null): string {
  return valor === null ? '—' : `${valor} min`;
}
