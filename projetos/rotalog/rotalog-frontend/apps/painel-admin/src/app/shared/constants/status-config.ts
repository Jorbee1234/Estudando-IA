import {
  StatusAlertaManutencao,
  StatusEntrega,
  StatusManutencao,
  StatusMotorista,
  StatusVeiculo,
} from '../../core/models';

export type Dominio =
  | 'veiculo'
  | 'motorista'
  | 'manutencao'
  | 'entrega'
  | 'alertaManutencao';
export type Tom = 'sucesso' | 'alerta' | 'perigo' | 'info' | 'neutro';

export interface StatusInfo {
  rotulo: string;
  tom: Tom;
  /** Ícone decorativo: o rótulo sempre acompanha (status nunca só por cor). */
  icone: string;
}

// Única fonte de rótulo, tom e ícone de status (ADR 0001, D3).
// O tom vira classe CSS na fase 5.
export const STATUS_CONFIG: Record<Dominio, Record<string, StatusInfo>> = {
  veiculo: {
    [StatusVeiculo.ATIVO]: { rotulo: 'Ativo', tom: 'sucesso', icone: '●' },
    [StatusVeiculo.INATIVO]: { rotulo: 'Inativo', tom: 'perigo', icone: '○' },
    // A API chama de MANUTENCAO; para o usuário é "Em manutenção".
    [StatusVeiculo.MANUTENCAO]: {
      rotulo: 'Em manutenção',
      tom: 'alerta',
      icone: '⚙',
    },
  },
  motorista: {
    [StatusMotorista.ATIVO]: { rotulo: 'Ativo', tom: 'sucesso', icone: '●' },
    [StatusMotorista.INATIVO]: { rotulo: 'Inativo', tom: 'perigo', icone: '○' },
    [StatusMotorista.FERIAS]: { rotulo: 'Férias', tom: 'info', icone: '☀' },
  },
  manutencao: {
    [StatusManutencao.PENDENTE]: {
      rotulo: 'Pendente',
      tom: 'info',
      icone: '◔',
    },
    [StatusManutencao.EM_ANDAMENTO]: {
      rotulo: 'Em andamento',
      tom: 'alerta',
      icone: '⚙',
    },
    [StatusManutencao.CONCLUIDA]: {
      rotulo: 'Concluída',
      tom: 'sucesso',
      icone: '✓',
    },
    [StatusManutencao.CANCELADA]: {
      rotulo: 'Cancelada',
      tom: 'perigo',
      icone: '✕',
    },
  },
  entrega: {
    [StatusEntrega.PENDENTE]: {
      rotulo: 'Pendente',
      tom: 'alerta',
      icone: '◔',
    },
    [StatusEntrega.ATRIBUIDA]: {
      rotulo: 'Atribuída',
      tom: 'info',
      icone: '◐',
    },
    [StatusEntrega.EM_TRANSITO]: {
      rotulo: 'Em trânsito',
      tom: 'info',
      icone: '➜',
    },
    [StatusEntrega.ENTREGUE]: {
      rotulo: 'Entregue',
      tom: 'sucesso',
      icone: '✓',
    },
    [StatusEntrega.CANCELADA]: {
      rotulo: 'Cancelada',
      tom: 'perigo',
      icone: '✕',
    },
  },
  alertaManutencao: {
    [StatusAlertaManutencao.PENDENTE]: {
      rotulo: 'Pendente',
      tom: 'alerta',
      icone: '◔',
    },
    [StatusAlertaManutencao.ENVIADO]: {
      rotulo: 'Enviado',
      tom: 'sucesso',
      icone: '✓',
    },
    [StatusAlertaManutencao.FALHA]: {
      rotulo: 'Falha',
      tom: 'perigo',
      icone: '✕',
    },
  },
};

/** Status fora da tabela (valor novo da API) não quebra a tela: rótulo neutro com o texto cru. */
export function infoDoStatus(
  dominio: Dominio,
  valor: string | null | undefined
): StatusInfo {
  const chave = (valor ?? '').trim().toUpperCase();
  return (
    STATUS_CONFIG[dominio][chave] ?? {
      rotulo: valor?.trim() || 'Desconhecido',
      tom: 'neutro',
      icone: '?',
    }
  );
}
