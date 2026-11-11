import { z } from 'zod';

/** DECIMAL chega como string (Sequelize); `null` e vazio viram `null`. */
const decimal = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'número inválido' });
      return z.NEVER;
    }
    return n;
  });

const textoOuNulo = z
  .string()
  .nullish()
  .transform((v) => v ?? null);

/** BIGINT chega como string no pg; o front trata o id como string. */
const id = z.union([z.string(), z.number()]).transform(String);

export const eventoSchema = z.object({
  id,
  evento: z.string(),
  descricao: textoOuNulo,
  latitude: decimal,
  longitude: decimal,
  data_evento: z.string(),
});

/**
 * `GET /api/rastreamento/pedido/:numero` (ADR 0002, D5b). O resumo público não traz
 * motorista nem placa, e é traduzido para o modelo usado pelas telas.
 */
export const pedidoSchema = z
  .object({
    pedido: z.string(),
    status: z.string(),
    origem: z.string(),
    destino: z.string(),
    origem_lat: decimal,
    origem_lng: decimal,
    destino_lat: decimal,
    destino_lng: decimal,
    distancia_km: decimal,
    tempo_estimado_minutos: decimal,
    data_criacao: textoOuNulo,
    data_entrega: textoOuNulo,
    eventos: z.array(eventoSchema).nullish().transform((v) => v ?? []),
  })
  .transform((p) => ({
    numero_pedido: p.pedido,
    status: p.status,
    origem_endereco: p.origem,
    destino_endereco: p.destino,
    origem_lat: p.origem_lat,
    origem_lng: p.origem_lng,
    destino_lat: p.destino_lat,
    destino_lng: p.destino_lng,
    distancia_km: p.distancia_km,
    tempo_estimado_minutos: p.tempo_estimado_minutos,
    data_criacao: p.data_criacao,
    data_entrega: p.data_entrega,
    rastreamentos: p.eventos,
  }));
