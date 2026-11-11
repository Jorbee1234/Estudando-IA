import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { of, throwError } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { EntregasApiService } from '../../core/api/entregas-api.service';
import { ManutencoesApiService } from '../../core/api/manutencoes-api.service';
import { MotoristasApiService } from '../../core/api/motoristas-api.service';
import { VeiculosApiService } from '../../core/api/veiculos-api.service';
import { DashboardPage } from './dashboard.page';

// ADR 0001, fase 4: contadores por enum, sem valores fixos e com erro de verdade.
describe('DashboardPage', () => {
  const veiculos = { listar: jest.fn() };
  const motoristas = { listar: jest.fn() };
  const manutencoes = { listar: jest.fn() };
  const entregas = { listar: jest.fn() };

  function criar() {
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        { provide: VeiculosApiService, useValue: veiculos },
        { provide: MotoristasApiService, useValue: motoristas },
        { provide: ManutencoesApiService, useValue: manutencoes },
        { provide: EntregasApiService, useValue: entregas },
      ],
    });
    return TestBed.createComponent(DashboardPage).componentInstance;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    veiculos.listar.mockReturnValue(
      of([{ status: 'ATIVO' }, { status: 'MANUTENCAO' }, { status: 'INATIVO' }])
    );
    motoristas.listar.mockReturnValue(of([{ status: 'ATIVO' }, { status: 'FERIAS' }]));
    manutencoes.listar.mockReturnValue(
      of([{ status: 'PENDENTE' }, { status: 'CONCLUIDA' }, { status: 'PENDENTE' }])
    );
    entregas.listar.mockReturnValue(
      of([{ status: 'EM_TRANSITO' }, { status: 'ENTREGUE' }])
    );
  });

  it('veiculosInativos conta só INATIVO (manutenção não é inativo)', async () => {
    const c = criar();
    await c.carregarDados();
    expect(c.veiculosAtivos()).toBe(1);
    expect(c.veiculosInativos()).toBe(1);
  });

  it('conta entregas em trânsito pelo enum', async () => {
    const c = criar();
    await c.carregarDados();
    expect(c.entregasEmAndamento()).toBe(1);
  });

  it('manutenções vêm da API, não de valores fixos', async () => {
    const c = criar();
    await c.carregarDados();
    expect(c.totalManutencoes()).toBe(3);
    expect(c.manutencoesPendentes()).toBe(2);
  });

  it('API fora do ar mostra erro (e não zeros)', async () => {
    veiculos.listar.mockReturnValue(
      throwError(() => new ApiError(0, 'Não foi possível conectar ao servidor.'))
    );
    const c = criar();
    await c.carregarDados();
    expect(c.error()).toBe('Não foi possível conectar ao servidor.');
    expect(c.loading()).toBe(false);
  });

  it('limpa o erro ao recarregar com sucesso', async () => {
    const c = criar();
    c.error.set('antigo');
    await c.carregarDados();
    expect(c.error()).toBeNull();
  });

  it('limita as últimas entregas a 5', async () => {
    entregas.listar.mockReturnValue(
      of(Array.from({ length: 8 }, () => ({ status: 'PENDENTE' })))
    );
    const c = criar();
    await c.carregarDados();
    expect(c.ultimasEntregas()).toHaveLength(5);
  });
});

// ADR 0003, fase 5 (D4): alertas calculados, gráficos adiados e atalho para o rastreamento.
describe('DashboardPage: alertas, gráficos e rastreamento', () => {
  const veiculos = { listar: jest.fn() };
  const motoristas = { listar: jest.fn() };
  const manutencoes = { listar: jest.fn() };
  const entregas = { listar: jest.fn() };

  async function montar() {
    TestBed.configureTestingModule({
      imports: [DashboardPage],
      deferBlockBehavior: DeferBlockBehavior.Manual,
      providers: [
        provideRouter([]),
        { provide: VeiculosApiService, useValue: veiculos },
        { provide: MotoristasApiService, useValue: motoristas },
        { provide: ManutencoesApiService, useValue: manutencoes },
        { provide: EntregasApiService, useValue: entregas },
      ],
    });
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    await fixture.componentInstance.carregarDados();
    fixture.detectChanges();
    return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
  }

  const ontem = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  const daquiA = (dias: number) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    veiculos.listar.mockReturnValue(
      of([
        { id: 1, placa: 'AAA1111', status: 'ATIVO' },
        { id: 2, placa: 'BBB2222', status: 'MANUTENCAO' },
        { id: 3, placa: 'CCC3333', status: 'INATIVO' },
      ])
    );
    motoristas.listar.mockReturnValue(
      of([
        { id: 1, nome: 'Ana', validade_cnh: '2000-01-01', status: 'ATIVO' },
        { id: 2, nome: 'Bruno', validade_cnh: daquiA(10), status: 'FERIAS' },
        { id: 3, nome: 'Carla', validade_cnh: '2999-01-01', status: 'ATIVO' },
      ])
    );
    manutencoes.listar.mockReturnValue(
      of([
        { id: 1, veiculo_id: 2, data_agendada: '2020-03-20', status: 'PENDENTE' },
        { id: 2, veiculo_id: 1, data_agendada: '2999-03-20', status: 'PENDENTE' },
      ])
    );
    entregas.listar.mockReturnValue(
      of([
        { id: 7, codigo_rastreio: 'PED-1', status: 'EM_TRANSITO' },
        { id: 8, codigo_rastreio: 'PED-2', status: 'ENTREGUE' },
      ])
    );
  });

  it('os alertas vêm dos dados (CNH vencida e a vencer, manutenção atrasada, frota), não de texto fixo', async () => {
    const { c } = await montar();
    expect(c.alertas().map((a) => a.id)).toEqual([
      'cnh-1',
      'manutencao-1',
      'cnh-2',
      'frota-manutencao',
      'frota-inativos',
    ]);
    expect(c.alertas()[0].mensagem).toContain('CNH de Ana venceu');
    expect(c.alertas()[1].mensagem).toContain('BBB2222');
  });

  it('nenhuma mensagem do antigo texto fixo aparece', async () => {
    const { el } = await montar();
    for (const antigo of ['João Silva', 'ABC-1234', 'Carlos Oliveira', '2 horas']) {
      expect(el.textContent).not.toContain(antigo);
    }
  });

  it('cada alerta é um link para a tela de origem, com o filtro na URL', async () => {
    const { el } = await montar();
    const links = Array.from(el.querySelectorAll('.alert-message')) as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/motoristas?q=Ana',
      '/manutencoes',
      '/motoristas?q=Bruno',
      '/veiculos?status=MANUTENCAO',
      '/veiculos?status=INATIVO',
    ]);
  });

  it('cada alerta diz a severidade em texto, não só pela cor', async () => {
    const { el } = await montar();
    const textos = Array.from(el.querySelectorAll('.alert-item .visually-hidden')).map((e) => e.textContent?.trim());
    expect(textos).toEqual(['Crítico:', 'Atenção:', 'Atenção:', 'Informação:', 'Informação:']);
  });

  it('os cartões trazem indicadores calculados', async () => {
    const { c, el } = await montar();
    expect(c.veiculosEmManutencao()).toBe(1);
    expect(c.motoristasEmFerias()).toBe(1);
    expect(c.cnhEmAtencao()).toBe(2);
    expect(c.manutencoesAtrasadas()).toBe(1);
    const cartoes = Array.from(el.querySelectorAll('.stat-card')).map((a) => a.textContent?.replace(/\s+/g, ' ').trim());
    expect(cartoes[0]).toContain('1 em manutenção');
    expect(cartoes[1]).toContain('1 de férias');
    expect(cartoes[1]).toContain('2 com CNH vencida ou a vencer');
    expect(cartoes[3]).toContain('1 atrasada');
    expect(cartoes[3]).toContain('2 pendentes');
    expect(cartoes[0]).toContain('1 ativo');
    expect(cartoes[0]).toContain('1 inativo');
  });

  it('sem nada a avisar, mostra "Nenhum alerta no momento."', async () => {
    veiculos.listar.mockReturnValue(of([{ id: 1, placa: 'A', status: 'ATIVO' }]));
    motoristas.listar.mockReturnValue(of([{ id: 1, nome: 'Ana', validade_cnh: '2999-01-01', status: 'ATIVO' }]));
    manutencoes.listar.mockReturnValue(of([]));
    const { el, c } = await montar();
    expect(c.alertas()).toEqual([]);
    expect(el.querySelector('.sem-alertas')?.textContent).toContain('Nenhum alerta no momento.');
    expect(el.querySelector('.alert-list')).toBeNull();
  });

  it('mostra no máximo 6 alertas e avisa quantos ficaram de fora', async () => {
    motoristas.listar.mockReturnValue(
      of(Array.from({ length: 9 }, (_, i) => ({ id: i + 1, nome: `M${i}`, validade_cnh: ontem(), status: 'ATIVO' })))
    );
    const { c, el } = await montar();
    expect(c.alertas().length).toBeGreaterThan(6);
    expect(el.querySelectorAll('.alert-item')).toHaveLength(6);
    expect(el.querySelector('.alert-mais')?.textContent).toContain(`e mais ${c.alertasOcultos()} alertas`);
  });

  it('os gráficos e a tabela chegam por @defer: antes são esqueletos, depois os dados', async () => {
    const { fixture, el } = await montar();
    expect(el.querySelector('app-donut-chart')).toBeNull();
    expect(el.querySelector('app-bar-chart')).toBeNull();
    expect(el.querySelector('app-data-table')).toBeNull();
    expect(el.querySelectorAll('app-skeleton').length).toBeGreaterThan(0);

    for (const bloco of await fixture.getDeferBlocks()) await bloco.render(DeferBlockState.Complete);
    fixture.detectChanges();

    expect(el.querySelector('app-donut-chart')).not.toBeNull();
    expect(el.querySelectorAll('app-bar-chart')).toHaveLength(2);
    const tabelas = Array.from(el.querySelectorAll('div.visually-hidden table caption')).map((c) => c.textContent);
    expect(tabelas).toEqual(['Frota por situação', 'Manutenções por mês', 'Entregas por status']);
    expect(el.querySelector('app-data-table')).not.toBeNull();
  });

  it('o código de cada entrega leva à lista já com a entrega aberta (?id=)', async () => {
    const { fixture, el } = await montar();
    for (const bloco of await fixture.getDeferBlocks()) await bloco.render(DeferBlockState.Complete);
    fixture.detectChanges();
    const hrefs = Array.from(el.querySelectorAll('app-data-table tbody a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['/entregas?id=7', '/entregas?id=8']);
  });

  it('"Ver no rastreamento" abre o app em nova aba, sem vazar o opener, com aviso para leitor de tela', async () => {
    const { el } = await montar();
    const link = el.querySelector('.secao-cabecalho a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe(environment.rastreamentoUrl);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.textContent).toContain('(abre em nova aba)');
  });

  it('recarregar atualiza a referência de "hoje"', async () => {
    const { c } = await montar();
    const antes = c.hoje();
    await new Promise((r) => setTimeout(r, 5));
    await c.carregarDados();
    expect(c.hoje().getTime()).toBeGreaterThan(antes.getTime());
  });
});
