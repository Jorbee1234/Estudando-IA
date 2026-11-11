import {
  entregaDeApi,
  manutencaoDeApi,
  manutencaoParaApi,
  motoristaDeApi,
  motoristaParaApi,
  veiculoDeApi,
  veiculoParaApi,
} from './index';
import {
  Manutencao,
  Motorista,
  StatusEntrega,
  StatusManutencao,
  StatusMotorista,
  StatusVeiculo,
  TipoManutencao,
  Veiculo,
} from '../models';

// Contrato (ADR 0001, D8): payloads no formato exato das APIs, montados a partir
// das entidades/DTOs da api-frotas (Veiculo, Motorista, Manutencao, *Request) e
// do model Entrega da api-entregas. Não foram capturados de uma API no ar.
describe('mappers: veículo', () => {
  const api = {
    id: 7,
    placa: 'ABC1D23',
    modelo: 'Volvo FH',
    anoFabricacao: 2021,
    quilometragem: 120500,
    status: 'MANUTENCAO',
    dataCadastro: '2025-01-10T09:00:00',
    dataAtualizacao: '2025-02-01T10:00:00',
  };

  it('lê anoFabricacao e quilometragem como ano e km_atual', () => {
    const v = veiculoDeApi(api);
    expect(v).toMatchObject({
      id: 7,
      placa: 'ABC1D23',
      ano: 2021,
      km_atual: 120500,
      status: StatusVeiculo.MANUTENCAO,
      created_at: '2025-01-10T09:00:00',
    });
  });

  it('o POST usa anoFabricacao e quilometragem (e só os 4 campos do VeiculoRequest)', () => {
    const body = veiculoParaApi({
      placa: ' abc1d23 ',
      modelo: 'Volvo FH ',
      ano: 2021,
      km_atual: 10,
      // Campos que o painel já teve e a API não grava: não podem ir no corpo.
      marca: 'Volvo',
      tipo: 'CAMINHAO',
    } as Partial<Veiculo>);
    expect(body).toEqual({
      placa: 'ABC1D23',
      modelo: 'Volvo FH',
      anoFabricacao: 2021,
      quilometragem: 10,
    });
  });

  it('ida e volta preserva os campos que a API tem', () => {
    const v = veiculoDeApi(api);
    expect(veiculoParaApi(v)).toEqual({
      placa: 'ABC1D23',
      modelo: 'Volvo FH',
      anoFabricacao: 2021,
      quilometragem: 120500,
    });
  });

  it('aceita campos nulos sem quebrar', () => {
    const v = veiculoDeApi({
      ...api,
      modelo: null,
      anoFabricacao: null,
      quilometragem: null,
      dataCadastro: null,
    });
    expect(v).toMatchObject({ modelo: '', ano: 0, km_atual: 0 });
    expect(v.created_at).toBeUndefined();
  });

  it('normaliza caixa e espaços do status na borda', () => {
    expect(veiculoDeApi({ ...api, status: ' ativo ' }).status).toBe(
      StatusVeiculo.ATIVO
    );
  });

  it('mantém status desconhecido em vez de trocá-lo por outro', () => {
    expect(veiculoDeApi({ ...api, status: 'baixado' }).status).toBe('BAIXADO');
  });
});

describe('mappers: motorista', () => {
  const api = {
    id: 3,
    nome: 'João Silva',
    cnh: '12345678900',
    categoriaCnh: 'D',
    vencimentoCnh: '2026-03-26',
    status: 'FERIAS',
  };

  it('lê categoriaCnh e vencimentoCnh', () => {
    expect(motoristaDeApi(api)).toMatchObject({
      categoria_cnh: 'D',
      validade_cnh: '2026-03-26',
      status: StatusMotorista.FERIAS,
    });
  });

  it('o envio leva vencimentoCnh (antes a validade nunca chegava ao servidor)', () => {
    expect(
      motoristaParaApi({
        nome: ' João Silva ',
        cnh: '12345678900',
        categoria_cnh: 'D',
        validade_cnh: '2026-03-26',
        cpf: '000',
        telefone: '1',
      } as Partial<Motorista>)
    ).toEqual({
      nome: 'João Silva',
      cnh: '12345678900',
      categoriaCnh: 'D',
      vencimentoCnh: '2026-03-26',
    });
  });

  it('CNH sem vencimento vira string vazia', () => {
    expect(
      motoristaDeApi({ ...api, vencimentoCnh: null }).validade_cnh
    ).toBe('');
  });
});

describe('mappers: manutenção', () => {
  const api = {
    id: 11,
    veiculoId: 7,
    tipoManutencao: 'CORRETIVA',
    dataManutencao: '2025-03-05T08:30:00',
    quilometragemManutencao: 99000,
    custo: 1500.5,
    descricao: 'Troca de freios',
    status: 'PENDENTE',
  };

  it('lê os campos reais da API', () => {
    expect(manutencaoDeApi(api)).toEqual({
      id: 11,
      veiculo_id: 7,
      tipo: TipoManutencao.CORRETIVA,
      descricao: 'Troca de freios',
      data_agendada: '2025-03-05T08:30:00',
      data_realizada: null,
      custo: 1500.5,
      status: StatusManutencao.PENDENTE,
      km_na_manutencao: 99000,
    });
  });

  it('o envio usa veiculoId, tipoManutencao e custoEstimado', () => {
    expect(
      manutencaoParaApi({
        veiculo_id: 7,
        tipo: TipoManutencao.REVISAO,
        descricao: 'Revisão',
        custo: 300,
        oficina: 'X',
      } as Partial<Manutencao>)
    ).toEqual({
      veiculoId: 7,
      tipoManutencao: 'REVISAO',
      descricao: 'Revisão',
      custoEstimado: 300,
    });
  });
});

describe('mappers: entrega', () => {
  const api = {
    id: '42',
    numero_pedido: 'PED-2025-001',
    status: 'em_transito',
    origem_endereco: 'Rua A, 1',
    destino_endereco: 'Rua B, 2',
    motorista_id: '3',
    motorista_nome: 'João Silva',
    veiculo_placa: 'ABC1D23',
    distancia_km: '12.50',
    tempo_estimado_minutos: 40,
    data_criacao: '2025-03-01T10:00:00.000Z',
  };

  it('numero_pedido aparece como codigo_rastreio (coluna Código)', () => {
    expect(entregaDeApi(api).codigo_rastreio).toBe('PED-2025-001');
  });

  it('converte DECIMAL/BIGINT em string para número', () => {
    expect(entregaDeApi(api)).toMatchObject({
      id: 42,
      distancia_km: 12.5,
      motorista_id: 3,
      tempo_estimado_minutos: 40,
    });
  });

  it('em_transito minúsculo vira EM_TRANSITO (fim do remendo do dashboard)', () => {
    expect(entregaDeApi(api).status).toBe(StatusEntrega.EM_TRANSITO);
  });

  it('entrega sem motorista fica com campos vazios', () => {
    const e = entregaDeApi({
      ...api,
      motorista_id: null,
      motorista_nome: null,
      veiculo_placa: null,
      distancia_km: null,
    });
    expect(e).toMatchObject({
      motorista_id: null,
      motorista_nome: '',
      veiculo_placa: '',
      distancia_km: 0,
    });
  });
});
