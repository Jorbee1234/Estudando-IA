import { Entrega, Manutencao, Motorista, StatusEntrega, StatusManutencao, StatusMotorista, StatusVeiculo, Veiculo } from '../../core/models';
import {
  calcularAlertas,
  contarCnhEmAtencao,
  contarManutencoesAtrasadas,
  entregasPorStatus,
  formatarData,
  frotaPorSituacao,
  lerData,
  manutencoesPorMes,
  pluralizar,
} from './dashboard.dados';

// ADR 0003, fase 5 (D4): alertas e gráficos calculados só com o que as APIs entregam.
const HOJE = new Date(2026, 10, 9, 15, 30); // 09/11/2026, à tarde (a hora não pode contar)

const motorista = (id: number, nome: string, validade: string, status = StatusMotorista.ATIVO) =>
  ({ id, nome, cnh: String(id), categoria_cnh: 'C', validade_cnh: validade, status }) as Motorista;
const veiculo = (id: number, placa: string, status = StatusVeiculo.ATIVO) =>
  ({ id, placa, modelo: 'X', ano: 2020, km_atual: 1, status }) as Veiculo;
const manutencao = (id: number, veiculoId: number, data: string, status = StatusManutencao.PENDENTE) =>
  ({ id, veiculo_id: veiculoId, data_agendada: data, status }) as Manutencao;
const entrega = (status: StatusEntrega) => ({ status }) as Entrega;

describe('lerData / formatarData', () => {
  it('lê aaaa-mm-dd como data local, sem deslocar o dia por fuso', () => {
    const d = lerData('2026-11-09');
    expect([d?.getFullYear(), d?.getMonth(), d?.getDate()]).toEqual([2026, 10, 9]);
    expect(lerData('2026-11-09T23:59:59Z')?.getDate()).toBe(9);
  });

  it('rejeita texto vazio, inválido e datas inexistentes', () => {
    for (const ruim of ['', null, undefined, 'amanhã', '09/11/2026', '2026-02-31', '2026-13-01']) {
      expect(lerData(ruim)).toBeNull();
    }
  });

  it('formata dd/mm/aaaa', () => {
    expect(formatarData(new Date(2026, 2, 5))).toBe('05/03/2026');
  });
});

describe('calcularAlertas: CNH', () => {
  const alertas = (...m: Motorista[]) => calcularAlertas(m, [], [], HOJE);

  it('vencida é crítica e informa a data', () => {
    const [a] = alertas(motorista(1, 'Ana', '2026-11-08'));
    expect(a).toMatchObject({ id: 'cnh-1', tipo: 'danger', data: '08/11/2026', rota: '/motoristas', params: { q: 'Ana' } });
    expect(a.mensagem).toBe('CNH de Ana venceu em 08/11/2026');
  });

  it('vence hoje, amanhã e em N dias: atenção, com o texto certo', () => {
    const textos = alertas(
      motorista(1, 'A', '2026-11-09'),
      motorista(2, 'B', '2026-11-10'),
      motorista(3, 'C', '2026-11-24')
    ).map((a) => [a.tipo, a.mensagem]);
    expect(textos).toEqual([
      ['warning', 'CNH de A vence hoje'],
      ['warning', 'CNH de B vence amanhã'],
      ['warning', 'CNH de C vence em 15 dias'],
    ]);
  });

  it('o limite é de 30 dias: no dia 30 avisa, no 31 não', () => {
    expect(alertas(motorista(1, 'A', '2026-12-09'))).toHaveLength(1);
    expect(alertas(motorista(1, 'A', '2026-12-10'))).toHaveLength(0);
  });

  it('motorista INATIVO, sem validade ou com data inválida não gera alerta', () => {
    expect(
      alertas(
        motorista(1, 'A', '2020-01-01', StatusMotorista.INATIVO),
        motorista(2, 'B', ''),
        motorista(3, 'C', 'lixo')
      )
    ).toEqual([]);
  });

  it('motorista de férias com CNH vencida ainda é alerta', () => {
    expect(alertas(motorista(1, 'A', '2020-01-01', StatusMotorista.FERIAS))).toHaveLength(1);
  });

  it('a hora do dia não muda o resultado (hoje às 23:59 e às 00:01 dão o mesmo)', () => {
    const m = [motorista(1, 'A', '2026-11-10')];
    const tarde = calcularAlertas(m, [], [], new Date(2026, 10, 9, 23, 59));
    const cedo = calcularAlertas(m, [], [], new Date(2026, 10, 9, 0, 1));
    expect(tarde[0].mensagem).toBe('CNH de A vence amanhã');
    expect(cedo[0].mensagem).toBe(tarde[0].mensagem);
  });
});

describe('calcularAlertas: manutenções e frota', () => {
  it('pendente com data passada é atenção e usa a placa do veículo', () => {
    const [a] = calcularAlertas([], [manutencao(7, 2, '2026-11-01')], [veiculo(2, 'XYZ9K88')], HOJE);
    expect(a).toMatchObject({ id: 'manutencao-7', tipo: 'warning', data: '01/11/2026', rota: '/manutencoes' });
    expect(a.mensagem).toBe('Manutenção do veículo XYZ9K88 atrasada (agendada para 01/11/2026)');
  });

  it('veículo desconhecido aparece como #id', () => {
    const [a] = calcularAlertas([], [manutencao(7, 99, '2026-11-01')], [], HOJE);
    expect(a.mensagem).toContain('#99');
  });

  it('hoje, no futuro e status diferente de PENDENTE não são atraso', () => {
    const lista = [
      manutencao(1, 1, '2026-11-09'),
      manutencao(2, 1, '2026-12-01'),
      manutencao(3, 1, '2026-01-01', StatusManutencao.CONCLUIDA),
      manutencao(4, 1, '2026-01-01', StatusManutencao.EM_ANDAMENTO),
      manutencao(5, 1, '2026-01-01', StatusManutencao.CANCELADA),
      manutencao(6, 1, 'sem data'),
    ];
    expect(calcularAlertas([], lista, [veiculo(1, 'A')], HOJE)).toEqual([]);
  });

  it('frota: informa veículos em manutenção e inativos, com plural correto e link filtrado', () => {
    const v = [
      veiculo(1, 'A', StatusVeiculo.MANUTENCAO),
      veiculo(2, 'B', StatusVeiculo.INATIVO),
      veiculo(3, 'C', StatusVeiculo.INATIVO),
      veiculo(4, 'D'),
    ];
    const al = calcularAlertas([], [], v, HOJE);
    expect(al.map((a) => a.mensagem)).toEqual(['1 veículo em manutenção', '2 veículos inativos']);
    expect(al.map((a) => a.params)).toEqual([{ status: 'MANUTENCAO' }, { status: 'INATIVO' }]);
    expect(al.every((a) => a.tipo === 'info' && a.data === null)).toBe(true);
  });

  it('ordena por severidade e, dentro dela, pela data mais antiga', () => {
    const al = calcularAlertas(
      [motorista(1, 'Tarde', '2026-11-20'), motorista(2, 'Cedo', '2026-11-12'), motorista(3, 'Vencida', '2026-10-01')],
      [manutencao(1, 1, '2026-09-01')],
      [veiculo(1, 'A', StatusVeiculo.MANUTENCAO)],
      HOJE
    );
    expect(al.map((a) => [a.tipo, a.id])).toEqual([
      ['danger', 'cnh-3'],
      ['warning', 'manutencao-1'],
      ['warning', 'cnh-2'],
      ['warning', 'cnh-1'],
      ['info', 'frota-manutencao'],
    ]);
  });

  it('sem dados, sem alertas', () => {
    expect(calcularAlertas([], [], [], HOJE)).toEqual([]);
  });

  it('os contadores reaproveitam os mesmos alertas', () => {
    const al = calcularAlertas(
      [motorista(1, 'A', '2026-11-10'), motorista(2, 'B', '2020-01-01')],
      [manutencao(1, 1, '2026-01-01'), manutencao(2, 1, '2026-02-01')],
      [veiculo(1, 'X')],
      HOJE
    );
    expect(contarCnhEmAtencao(al)).toBe(2);
    expect(contarManutencoesAtrasadas(al)).toBe(2);
  });
});

describe('frotaPorSituacao', () => {
  it('conta por situação, na ordem ativo, manutenção, inativo, e omite as vazias', () => {
    const v = [veiculo(1, 'A'), veiculo(2, 'B'), veiculo(3, 'C', StatusVeiculo.INATIVO)];
    expect(frotaPorSituacao(v)).toEqual([
      { rotulo: 'Ativo', valor: 2, cor: 'var(--grafico-3)' },
      { rotulo: 'Inativo', valor: 1, cor: 'var(--grafico-sem-dado)' },
    ]);
    expect(frotaPorSituacao([])).toEqual([]);
  });

  it('usa o rótulo em pt-BR do STATUS_CONFIG ("Em manutenção"), não o texto cru da API', () => {
    expect(frotaPorSituacao([veiculo(1, 'A', StatusVeiculo.MANUTENCAO)])[0].rotulo).toBe('Em manutenção');
  });
});

describe('manutencoesPorMes', () => {
  it('agrupa pelo mês da data agendada, em ordem cronológica', () => {
    const m = [
      manutencao(1, 1, '2026-03-20'),
      manutencao(2, 1, '2026-01-05'),
      manutencao(3, 1, '2026-03-02'),
    ];
    expect(manutencoesPorMes(m).map((d) => [d.rotulo, d.valor])).toEqual([
      ['jan/2026', 1],
      ['mar/2026', 2],
    ]);
  });

  it('ignora datas inválidas e fica só com os 6 meses mais recentes', () => {
    const m = [
      manutencao(0, 1, 'sem data'),
      ...Array.from({ length: 8 }, (_, i) => manutencao(i + 1, 1, `2026-${String(i + 1).padStart(2, '0')}-10`)),
    ];
    const r = manutencoesPorMes(m);
    expect(r).toHaveLength(6);
    expect(r[0].rotulo).toBe('mar/2026');
    expect(r.at(-1)?.rotulo).toBe('ago/2026');
  });

  it('meses de anos diferentes ordenam certo', () => {
    const m = [manutencao(1, 1, '2027-01-10'), manutencao(2, 1, '2026-12-10')];
    expect(manutencoesPorMes(m).map((d) => d.rotulo)).toEqual(['dez/2026', 'jan/2027']);
  });
});

describe('entregasPorStatus', () => {
  it('segue o ciclo de vida, usa rótulos pt-BR e omite status sem entregas', () => {
    const r = entregasPorStatus([
      entrega(StatusEntrega.ENTREGUE),
      entrega(StatusEntrega.EM_TRANSITO),
      entrega(StatusEntrega.ENTREGUE),
    ]);
    expect(r.map((d) => [d.rotulo, d.valor])).toEqual([
      ['Em trânsito', 1],
      ['Entregue', 2],
    ]);
  });

  it('cada status tem sempre a mesma cor, esteja ou não presente', () => {
    const so = entregasPorStatus([entrega(StatusEntrega.ENTREGUE)]);
    const todos = entregasPorStatus(Object.values(StatusEntrega).map(entrega));
    expect(so[0].cor).toBe(todos.find((d) => d.rotulo === 'Entregue')?.cor);
    expect(new Set(todos.map((d) => d.cor)).size).toBe(todos.length);
  });
});

describe('pluralizar', () => {
  it('usa o singular só quando o número é 1 (0 e 2 vão para o plural)', () => {
    expect(pluralizar(1, 'ativo', 'ativos')).toBe('1 ativo');
    expect(pluralizar(0, 'ativo', 'ativos')).toBe('0 ativos');
    expect(pluralizar(2, 'ativo', 'ativos')).toBe('2 ativos');
  });
});
