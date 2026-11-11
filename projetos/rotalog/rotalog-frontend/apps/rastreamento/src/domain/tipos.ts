import { z } from 'zod';
import { eventoSchema, pedidoSchema } from './schemas';

export type EventoRastreamento = z.output<typeof eventoSchema>;
export type Entrega = z.output<typeof pedidoSchema>;

export interface Coordenada {
  lat: number;
  lng: number;
}
