/** Payloads no formato real da api-entregas (snake_case, DECIMAL como string, datas ISO). */
export const evento = (o: Record<string, unknown> = {}) => ({
  id: 1,
  entrega_id: 1,
  evento: 'POSICAO_ATUALIZADA',
  descricao: 'Em rota',
  latitude: '-23.5600000',
  longitude: '-46.6500000',
  data_evento: '2026-11-01T10:00:00.000Z',
  ...o,
});

/** Resposta de GET /api/rastreamento/pedido/:numero (resumo público, sem motorista nem placa). */
export const pedido = (o: Record<string, unknown> = {}) => ({
  pedido: 'PED-001',
  status: 'EM_TRANSITO',
  origem: 'Rua A, 1',
  destino: 'Rua B, 2',
  origem_lat: '-23.5505000',
  origem_lng: '-46.6333000',
  destino_lat: '-23.6000000',
  destino_lng: '-46.7000000',
  distancia_km: '12.50',
  tempo_estimado_minutos: 30,
  data_criacao: '2026-11-01T08:00:00.000Z',
  data_entrega: null,
  eventos: [evento()],
  ...o,
});

export const XSS = '<img src=x onerror="window.__xss=1">';

export function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}
