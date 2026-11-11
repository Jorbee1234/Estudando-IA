import { ApiError } from '../api/ApiError';
import { evento, pedido } from '../test/fixtures';
import { centroDaEntrega, formatarKm, mapearPedido, ordenarEventos, posicoesDaEntrega } from './mappers';
import { configDoStatus, StatusEntrega } from './status';

describe('mappers', () => {
  it('traduz o resumo público para o modelo, convertendo DECIMAL string em número', () => {
    const e = mapearPedido(pedido());
    expect(e.numero_pedido).toBe('PED-001');
    expect(e.origem_endereco).toBe('Rua A, 1');
    expect(e.origem_lat).toBe(-23.5505);
    expect(e.distancia_km).toBe(12.5);
    expect(e).not.toHaveProperty('motorista_nome');
  });

  it('null e ausente viram null e são exibidos como "—"', () => {
    const e = mapearPedido(pedido({ distancia_km: null, tempo_estimado_minutos: undefined }));
    expect(e.distancia_km).toBeNull();
    expect(e.tempo_estimado_minutos).toBeNull();
    expect(formatarKm(e.distancia_km)).toBe('—');
  });

  it('eventos ausentes ou vazios viram []', () => {
    expect(mapearPedido(pedido({ eventos: undefined })).rastreamentos).toEqual([]);
    expect(mapearPedido(pedido({ eventos: [] })).rastreamentos).toEqual([]);
  });

  it('resposta fora do formato vira ApiError, nunca dado errado', () => {
    expect(() => mapearPedido({ error: 'falhou' })).toThrow(ApiError);
    expect(() => mapearPedido(pedido({ origem_lat: 'abc' }))).toThrow(ApiError);
  });

  it('ordena eventos do mais recente ao mais antigo sem mutar a entrada', () => {
    const eventos = [evento({ id: 1, data_evento: '2026-11-01T10:00:00Z' }), evento({ id: 2, data_evento: '2026-11-01T12:00:00Z' })];
    const mapeados = mapearPedido(pedido({ eventos })).rastreamentos;
    expect(mapeados.map((e) => e.id)).toEqual(['2', '1']);
    expect(eventos[0]?.id).toBe(1);
    expect(ordenarEventos(mapeados)).not.toBe(mapeados);
  });

  it('status desconhecido cai em "Desconhecido"', () => {
    expect(configDoStatus('NOVO').rotulo).toBe('Desconhecido');
    expect(configDoStatus(StatusEntrega.EM_TRANSITO).etapa).toBe(2);
  });

  it('centro usa destino, depois origem; posições só de POSICAO_ATUALIZADA em ordem cronológica', () => {
    expect(centroDaEntrega(mapearPedido(pedido()))).toEqual({ lat: -23.6, lng: -46.7 });
    expect(centroDaEntrega(mapearPedido(pedido({ destino_lat: null })))).toEqual({ lat: -23.5505, lng: -46.6333 });
    const e = mapearPedido(
      pedido({
        eventos: [
          evento({ id: 1, data_evento: '2026-11-01T12:00:00Z' }),
          evento({ id: 2, evento: 'STATUS_ALTERADO' }),
          evento({ id: 3, data_evento: '2026-11-01T09:00:00Z' }),
        ],
      }),
    );
    expect(posicoesDaEntrega(e).map((p) => p.id)).toEqual(['3', '1']);
  });
});
