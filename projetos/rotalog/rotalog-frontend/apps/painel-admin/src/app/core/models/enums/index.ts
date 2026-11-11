// Valores reais das APIs (ADR 0001, D3). A API é a fonte de verdade.

// api-frotas, enum Java StatusVeiculo. Não existem EM_MANUTENCAO nem BAIXADO.
export enum StatusVeiculo {
  ATIVO = 'ATIVO',
  INATIVO = 'INATIVO',
  MANUTENCAO = 'MANUTENCAO',
}

// api-frotas guarda como texto livre: ATIVO, INATIVO, FERIAS. AFASTADO não existe.
export enum StatusMotorista {
  ATIVO = 'ATIVO',
  INATIVO = 'INATIVO',
  FERIAS = 'FERIAS',
}

// api-frotas: PENDENTE, EM_ANDAMENTO, CONCLUIDA, CANCELADA. AGENDADA não existe.
export enum StatusManutencao {
  PENDENTE = 'PENDENTE',
  EM_ANDAMENTO = 'EM_ANDAMENTO',
  CONCLUIDA = 'CONCLUIDA',
  CANCELADA = 'CANCELADA',
}

// api-entregas, constants/status.js.
export enum StatusEntrega {
  PENDENTE = 'PENDENTE',
  ATRIBUIDA = 'ATRIBUIDA',
  EM_TRANSITO = 'EM_TRANSITO',
  ENTREGUE = 'ENTREGUE',
  CANCELADA = 'CANCELADA',
}

// api-frotas, alertas de manutenção preventiva: status da notificação enviada ao gestor.
export enum StatusAlertaManutencao {
  PENDENTE = 'PENDENTE',
  ENVIADO = 'ENVIADO',
  FALHA = 'FALHA',
}

export enum TipoAlertaManutencao {
  KM = 'KM',
  DATA = 'DATA',
}

// api-frotas, comentário em Manutencao.tipoManutencao.
export enum TipoManutencao {
  PREVENTIVA = 'PREVENTIVA',
  CORRETIVA = 'CORRETIVA',
  REVISAO = 'REVISAO',
}
