import type { NomeIcone } from './icones';

/** Valores reais de `Entrega.status` na api-entregas. */
export enum StatusEntrega {
  PENDENTE = 'PENDENTE',
  ATRIBUIDA = 'ATRIBUIDA',
  EM_TRANSITO = 'EM_TRANSITO',
  ENTREGUE = 'ENTREGUE',
  CANCELADA = 'CANCELADA',
}

/** Eventos de rastreamento não são status. `evento` é texto livre na API: outros valores são aceitos. */
export enum TipoEvento {
  PEDIDO_CRIADO = 'PEDIDO_CRIADO',
  STATUS_ALTERADO = 'STATUS_ALTERADO',
  POSICAO_ATUALIZADA = 'POSICAO_ATUALIZADA',
  ENTREGA_CANCELADA = 'ENTREGA_CANCELADA',
}

export type VarianteStatus = StatusEntrega | 'DESCONHECIDO';

export interface ConfigStatus {
  variante: VarianteStatus;
  rotulo: string;
  icone: NomeIcone;
  /** Posição na linha de etapas (0 a 3); `null` para status fora do fluxo normal (cancelada, desconhecido). */
  etapa: number | null;
  /** Frase curta que responde "como está meu pedido?". */
  resumo: string;
}

export const STATUS_CONFIG: Record<VarianteStatus, ConfigStatus> = {
  [StatusEntrega.PENDENTE]: {
    variante: StatusEntrega.PENDENTE,
    rotulo: 'Pendente',
    icone: 'pendente',
    etapa: 0,
    resumo: 'Seu pedido foi recebido e aguarda a preparação para entrega.',
  },
  [StatusEntrega.ATRIBUIDA]: {
    variante: StatusEntrega.ATRIBUIDA,
    rotulo: 'Atribuída',
    icone: 'atribuida',
    etapa: 1,
    resumo: 'Um motorista foi designado e a entrega começa em breve.',
  },
  [StatusEntrega.EM_TRANSITO]: {
    variante: StatusEntrega.EM_TRANSITO,
    rotulo: 'Em Trânsito',
    icone: 'transito',
    etapa: 2,
    resumo: 'Seu pedido está a caminho do destino.',
  },
  [StatusEntrega.ENTREGUE]: {
    variante: StatusEntrega.ENTREGUE,
    rotulo: 'Entregue',
    icone: 'entregue',
    etapa: 3,
    resumo: 'Entrega concluída.',
  },
  [StatusEntrega.CANCELADA]: {
    variante: StatusEntrega.CANCELADA,
    rotulo: 'Cancelada',
    icone: 'cancelada',
    etapa: null,
    resumo: 'Este pedido foi cancelado.',
  },
  DESCONHECIDO: {
    variante: 'DESCONHECIDO',
    rotulo: 'Desconhecido',
    icone: 'desconhecido',
    etapa: null,
    resumo: 'Não foi possível identificar a situação deste pedido.',
  },
};

/** Etapas do fluxo normal, na ordem exibida. */
export const ETAPAS: readonly StatusEntrega[] = [
  StatusEntrega.PENDENTE,
  StatusEntrega.ATRIBUIDA,
  StatusEntrega.EM_TRANSITO,
  StatusEntrega.ENTREGUE,
];

export function statusConhecido(valor: string): valor is StatusEntrega {
  return (Object.values(StatusEntrega) as string[]).includes(valor);
}

/** Status novo vindo da API cai em "Desconhecido", de forma explícita. */
export function configDoStatus(valor: string): ConfigStatus {
  return statusConhecido(valor) ? STATUS_CONFIG[valor] : STATUS_CONFIG.DESCONHECIDO;
}

export function rotuloDoEvento(evento: string): string {
  return evento.replace(/_/g, ' ');
}

export interface ConfigEvento {
  rotulo: string;
  icone: NomeIcone;
}

const EVENTOS: Record<TipoEvento, ConfigEvento> = {
  [TipoEvento.PEDIDO_CRIADO]: { rotulo: 'Pedido criado', icone: 'pacote' },
  [TipoEvento.STATUS_ALTERADO]: { rotulo: 'Status alterado', icone: 'lista' },
  [TipoEvento.POSICAO_ATUALIZADA]: { rotulo: 'Posição atualizada', icone: 'origem' },
  [TipoEvento.ENTREGA_CANCELADA]: { rotulo: 'Entrega cancelada', icone: 'cancelada' },
};

/** `evento` é texto livre na API: tipo desconhecido usa ícone neutro e o texto cru. */
export function configDoEvento(evento: string): ConfigEvento {
  return (EVENTOS as Record<string, ConfigEvento | undefined>)[evento] ?? { rotulo: rotuloDoEvento(evento), icone: 'relogio' };
}
