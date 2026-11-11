import {
  StatusAlertaManutencao,
  StatusEntrega,
  StatusManutencao,
  StatusMotorista,
  StatusVeiculo,
  TipoAlertaManutencao,
  TipoManutencao,
} from './enums';

export * from './enums';

// Modelos do painel: só campos que as APIs realmente têm (ADR 0001, fase 8).

export interface Veiculo {
  id: number;
  placa: string;
  modelo: string;
  ano: number;
  km_atual: number;
  status: StatusVeiculo;
  created_at?: string;
}

export interface Motorista {
  id: number;
  nome: string;
  cnh: string;
  categoria_cnh: string;
  validade_cnh: string;
  status: StatusMotorista;
}

export interface Manutencao {
  id: number;
  veiculo_id: number;
  tipo: TipoManutencao;
  descricao: string;
  data_agendada: string;
  data_realizada: string | null;
  custo: number;
  status: StatusManutencao;
  km_na_manutencao: number;
}

export interface AlertaManutencao {
  id: number;
  veiculo_id: number;
  placa: string;
  modelo: string;
  tipo: TipoAlertaManutencao;
  motivo: string;
  km_atual: number;
  km_base: number;
  data_base: string;
  status: StatusAlertaManutencao;
  notificacao_id: number | null;
  tentativas: number;
  erro: string;
  created_at: string;
  updated_at: string;
}

export interface Entrega {
  id: number;
  codigo_rastreio: string;
  status: StatusEntrega;
  origem_endereco: string;
  destino_endereco: string;
  motorista_nome: string;
  veiculo_placa: string;
  distancia_km: number;
  tempo_estimado_minutos: number;
  created_at: string;
  motorista_id?: number | null;
}

// ---- Contratos das APIs (o que trafega de fato) ----

// api-frotas, entidade Veiculo.
export interface VeiculoApi {
  id: number;
  placa: string;
  modelo: string | null;
  anoFabricacao: number | null;
  quilometragem: number | null;
  status: string | null;
  dataCadastro?: string | null;
  dataAtualizacao?: string | null;
}

// POST/PUT /api/veiculos (VeiculoRequest).
export interface VeiculoRequest {
  placa: string;
  modelo: string;
  anoFabricacao: number;
  quilometragem: number;
}

export interface MotoristaApi {
  id: number;
  nome: string;
  cnh: string;
  categoriaCnh: string | null;
  vencimentoCnh: string | null;
  status: string | null;
}

// POST/PUT /api/motoristas (MotoristaRequest).
export interface MotoristaRequest {
  nome: string;
  cnh: string;
  categoriaCnh: string;
  vencimentoCnh: string;
}

export interface ManutencaoApi {
  id: number;
  veiculoId: number;
  tipoManutencao: string | null;
  dataManutencao: string | null;
  quilometragemManutencao: number | null;
  custo: number | null;
  descricao: string | null;
  status: string | null;
}

// POST /api/manutencoes (ManutencaoRequest).
export interface ManutencaoRequest {
  veiculoId: number;
  tipoManutencao: string;
  descricao: string;
  custoEstimado: number;
}

// api-frotas, GET /alertas-manutencao.
export interface AlertaManutencaoApi {
  id: number;
  veiculoId: number;
  placa: string | null;
  modelo: string | null;
  tipoAlerta: string | null;
  motivo: string | null;
  kmAtual: number | null;
  kmBase: number | null;
  dataBase: string | null;
  statusNotificacao: string | null;
  notificacaoId: number | null;
  tentativas: number | null;
  erro: string | null;
  dataCriacao: string | null;
  dataAtualizacao: string | null;
}

// POST /alertas-manutencao/verificar.
export interface VerificacaoAlertasApi {
  criados: number;
  alertas: AlertaManutencaoApi[];
}

// POST /alertas-manutencao/reprocessar.
export interface ReprocessamentoAlertasApi {
  reprocessados: number;
  enviados: number;
}

// api-entregas (Sequelize devolve DECIMAL como string).
export interface EntregaApi {
  id: number | string;
  numero_pedido: string;
  status: string;
  origem_endereco: string;
  destino_endereco: string;
  motorista_id?: number | string | null;
  motorista_nome?: string | null;
  veiculo_placa?: string | null;
  distancia_km?: number | string | null;
  tempo_estimado_minutos?: number | null;
  data_criacao?: string | null;
}
