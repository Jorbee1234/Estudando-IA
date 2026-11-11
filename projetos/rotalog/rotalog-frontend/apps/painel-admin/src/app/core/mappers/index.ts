import {
  AlertaManutencao,
  AlertaManutencaoApi,
  Entrega,
  EntregaApi,
  Manutencao,
  ManutencaoApi,
  ManutencaoRequest,
  Motorista,
  MotoristaApi,
  MotoristaRequest,
  StatusAlertaManutencao,
  StatusEntrega,
  StatusManutencao,
  StatusMotorista,
  StatusVeiculo,
  TipoAlertaManutencao,
  TipoManutencao,
  Veiculo,
  VeiculoApi,
  VeiculoRequest,
} from '../models';
import { normalizarEnum, paraNumero } from './normalizar';

// Mappers API <-> modelo do painel (ADR 0001, D2). As APIs não mudam; o painel se adapta.

const STATUS_VEICULO = Object.values(StatusVeiculo);
const STATUS_MOTORISTA = Object.values(StatusMotorista);
const STATUS_MANUTENCAO = Object.values(StatusManutencao);
const TIPOS_MANUTENCAO = Object.values(TipoManutencao);
const STATUS_ENTREGA = Object.values(StatusEntrega);
const STATUS_ALERTA = Object.values(StatusAlertaManutencao);
const TIPOS_ALERTA = Object.values(TipoAlertaManutencao);

export function alertaManutencaoDeApi(api: AlertaManutencaoApi): AlertaManutencao {
  return {
    id: api.id,
    veiculo_id: api.veiculoId,
    placa: api.placa ?? '',
    modelo: api.modelo ?? '',
    tipo: normalizarEnum(api.tipoAlerta, TIPOS_ALERTA, TipoAlertaManutencao.KM),
    motivo: api.motivo ?? '',
    km_atual: paraNumero(api.kmAtual),
    km_base: paraNumero(api.kmBase),
    data_base: api.dataBase ?? '',
    status: normalizarEnum(
      api.statusNotificacao,
      STATUS_ALERTA,
      StatusAlertaManutencao.PENDENTE
    ),
    notificacao_id: api.notificacaoId ?? null,
    tentativas: paraNumero(api.tentativas),
    erro: api.erro ?? '',
    created_at: api.dataCriacao ?? '',
    updated_at: api.dataAtualizacao ?? '',
  };
}

export function veiculoDeApi(api: VeiculoApi): Veiculo {
  return {
    id: api.id,
    placa: api.placa,
    modelo: api.modelo ?? '',
    ano: paraNumero(api.anoFabricacao),
    km_atual: paraNumero(api.quilometragem),
    status: normalizarEnum(api.status, STATUS_VEICULO, StatusVeiculo.INATIVO),
    created_at: api.dataCadastro ?? undefined,
  };
}

export function veiculoParaApi(v: Partial<Veiculo>): VeiculoRequest {
  return {
    placa: (v.placa ?? '').trim().toUpperCase(),
    modelo: (v.modelo ?? '').trim(),
    anoFabricacao: paraNumero(v.ano),
    quilometragem: paraNumero(v.km_atual),
  };
}

export function motoristaDeApi(api: MotoristaApi): Motorista {
  return {
    id: api.id,
    nome: api.nome,
    cnh: api.cnh,
    categoria_cnh: api.categoriaCnh ?? '',
    validade_cnh: api.vencimentoCnh ?? '',
    status: normalizarEnum(
      api.status,
      STATUS_MOTORISTA,
      StatusMotorista.INATIVO
    ),
  };
}

export function motoristaParaApi(m: Partial<Motorista>): MotoristaRequest {
  return {
    nome: (m.nome ?? '').trim(),
    cnh: (m.cnh ?? '').trim(),
    categoriaCnh: m.categoria_cnh ?? '',
    vencimentoCnh: m.validade_cnh ?? '',
  };
}

export function manutencaoDeApi(api: ManutencaoApi): Manutencao {
  return {
    id: api.id,
    veiculo_id: api.veiculoId,
    tipo: normalizarEnum(
      api.tipoManutencao,
      TIPOS_MANUTENCAO,
      TipoManutencao.PREVENTIVA
    ),
    descricao: api.descricao ?? '',
    data_agendada: api.dataManutencao ?? '',
    // A API não separa agendada de realizada: só há dataManutencao.
    data_realizada: null,
    custo: paraNumero(api.custo),
    status: normalizarEnum(
      api.status,
      STATUS_MANUTENCAO,
      StatusManutencao.PENDENTE
    ),
    km_na_manutencao: paraNumero(api.quilometragemManutencao),
  };
}

export function manutencaoParaApi(m: Partial<Manutencao>): ManutencaoRequest {
  return {
    veiculoId: paraNumero(m.veiculo_id),
    tipoManutencao: m.tipo ?? TipoManutencao.PREVENTIVA,
    descricao: m.descricao ?? '',
    custoEstimado: paraNumero(m.custo),
  };
}

export function entregaDeApi(api: EntregaApi): Entrega {
  return {
    id: paraNumero(api.id),
    // O painel chamava de codigo_rastreio o que a API chama de numero_pedido.
    codigo_rastreio: api.numero_pedido,
    status: normalizarEnum(api.status, STATUS_ENTREGA, StatusEntrega.PENDENTE),
    origem_endereco: api.origem_endereco,
    destino_endereco: api.destino_endereco,
    motorista_nome: api.motorista_nome ?? '',
    veiculo_placa: api.veiculo_placa ?? '',
    distancia_km: paraNumero(api.distancia_km),
    tempo_estimado_minutos: paraNumero(api.tempo_estimado_minutos),
    created_at: api.data_criacao ?? '',
    motorista_id:
      api.motorista_id == null ? null : paraNumero(api.motorista_id),
  };
}
