import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { VeiculosApiService } from '../../core/api/veiculos-api.service';
import { StatusVeiculo, Veiculo } from '../../core/models';
import { ToastService } from '../../core/notification/toast.service';
import { ConfirmService } from '../../core/notification/confirm.service';
import { VeiculosPage } from './veiculos.page';

// ADR 0001, fase 4: falha de API aparece na tela e não fecha o formulário.
describe('VeiculosPage', () => {
  const api = {
    listar: jest.fn(),
    criar: jest.fn(),
    atualizar: jest.fn(),
    desativar: jest.fn(),
    reativar: jest.fn(),
  };
  const lista = [
    { id: 1, placa: 'AAA1111', modelo: 'Volvo', status: StatusVeiculo.ATIVO },
    { id: 2, placa: 'BBB2222', modelo: 'Scania', status: StatusVeiculo.MANUTENCAO },
  ] as Veiculo[];
  const confirmacao = { confirmar: jest.fn() };
  const falha = () => throwError(() => new ApiError(500, 'Erro no servidor. Tente novamente.'));

  function criar() {
    TestBed.configureTestingModule({
      imports: [VeiculosPage],
      providers: [
        provideRouter([]),
        { provide: VeiculosApiService, useValue: api },
        { provide: ConfirmService, useValue: confirmacao },
      ],
    });
    return TestBed.createComponent(VeiculosPage).componentInstance;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    api.listar.mockReturnValue(of(lista));
    window.alert = jest.fn();
  });

  it('carrega e filtra por busca e por status', async () => {
    const c = criar();
    await c.carregarVeiculos();
    expect(c.veiculosFiltrados()).toHaveLength(2);
    c.url.definir({ q: 'scan' });
    expect(c.veiculosFiltrados().map((v) => v.id)).toEqual([2]);
    c.url.definir({ q: '', status: 'MANUTENCAO' });
    expect(c.veiculosFiltrados().map((v) => v.id)).toEqual([2]);
  });

  it('API fora do ar: erro visível e lista vazia (não confunde com "sem veículos")', async () => {
    api.listar.mockReturnValue(falha());
    const c = criar();
    await c.carregarVeiculos();
    expect(c.erro()).toBe('Erro no servidor. Tente novamente.');
    expect(c.veiculos()).toEqual([]);
    expect(c.loading()).toBe(false);
  });

  it('o formulário novo nasce com ano e km_atual do painel', () => {
    const c = criar();
    c.mostrarFormulario();
    expect(c.form.getRawValue()).toEqual({ placa: '', modelo: '', ano: 2024, km_atual: 0 });
  });

  it('bloqueia o envio sem placa/modelo e mostra o erro no campo, sem alert()', async () => {
    const c = criar();
    c.mostrarFormulario();
    await c.salvarVeiculo(new Event('submit'));
    expect(window.alert).not.toHaveBeenCalled();
    expect(c.erroDe('placa')).toBe('Campo obrigatório.');
    expect(c.erroDe('modelo')).toBe('Campo obrigatório.');
    expect(api.criar).not.toHaveBeenCalled();
    expect(c.mostrandoForm()).toBe(true);
  });

  it('criação com sucesso fecha o formulário e recarrega', async () => {
    api.criar.mockReturnValue(of(lista[0]));
    const c = criar();
    c.mostrarFormulario();
    c.form.patchValue({ placa: 'ABC1234', modelo: 'X' });
    await c.salvarVeiculo(new Event('submit'));
    expect(c.mostrandoForm()).toBe(false);
    expect(c.erro()).toBeNull();
    expect(api.listar).toHaveBeenCalled();
  });

  it('criação que falha mantém o formulário aberto e mostra o erro', async () => {
    api.criar.mockReturnValue(falha());
    const c = criar();
    c.mostrarFormulario();
    c.form.patchValue({ placa: 'ABC1234', modelo: 'X' });
    await c.salvarVeiculo(new Event('submit'));
    expect(c.mostrandoForm()).toBe(true);
    expect(c.form.controls.placa.value).toBe('ABC1234');
    expect(c.erro()).toBe('Erro no servidor. Tente novamente.');
  });

  it('edição chama atualizar com o id e mantém os campos originais do veículo', async () => {
    api.atualizar.mockReturnValue(of(lista[0]));
    const c = criar();
    c.editarVeiculo(lista[0]);
    await c.salvarVeiculo(new Event('submit'));
    expect(api.atualizar).toHaveBeenCalledWith(1, expect.objectContaining({ id: 1, placa: 'AAA1111', modelo: 'Volvo' }));
  });

  it('desativação que falha mostra o erro em vez de recarregar como se tivesse dado certo', async () => {
    confirmacao.confirmar.mockResolvedValue(true);
    api.desativar.mockReturnValue(falha());
    const c = criar();
    await c.confirmarDesativacao(lista[0]);
    expect(confirmacao.confirmar).toHaveBeenCalledWith(expect.objectContaining({ perigo: true }));
    expect(api.desativar).toHaveBeenCalledWith(1);
    expect(c.erro()).toBe('Erro no servidor. Tente novamente.');
    expect(api.listar).not.toHaveBeenCalled();
  });

  it('desativação confirmada chama PATCH desativar, recarrega a lista e avisa', async () => {
    confirmacao.confirmar.mockResolvedValue(true);
    api.desativar.mockReturnValue(of({ ...lista[0], status: StatusVeiculo.INATIVO }));
    const c = criar();
    await c.confirmarDesativacao(lista[0]);
    expect(api.desativar).toHaveBeenCalledWith(1);
    expect(api.listar).toHaveBeenCalled();
    expect(c.erro()).toBeNull();
    expect(TestBed.inject(ToastService).toasts().at(-1)?.mensagem).toContain('AAA1111');
  });

  it('desativação cancelada não chama a API', async () => {
    confirmacao.confirmar.mockResolvedValue(false);
    const c = criar();
    await c.confirmarDesativacao(lista[0]);
    expect(api.desativar).not.toHaveBeenCalled();
  });
});

describe('VeiculosPage: ordenação', () => {
  const api = { listar: jest.fn() };
  const dados = [
    { id: 2, placa: 'BBB', modelo: 'b', status: StatusVeiculo.ATIVO },
    { id: 1, placa: 'CCC', modelo: 'c', status: StatusVeiculo.ATIVO },
    { id: 3, placa: 'AAA', modelo: 'a', status: StatusVeiculo.ATIVO },
  ] as Veiculo[];

  async function pagina() {
    TestBed.configureTestingModule({
      imports: [VeiculosPage],
      providers: [provideRouter([]), { provide: VeiculosApiService, useValue: api }],
    });
    api.listar.mockReturnValue(of(dados));
    const c = TestBed.createComponent(VeiculosPage).componentInstance;
    await c.carregarVeiculos();
    return c;
  }

  it('primeiro clique ordena crescente; o segundo na mesma coluna inverte', async () => {
    const c = await pagina();
    c.ordenar('placa');
    expect(c.veiculosFiltrados().map((v) => v.placa)).toEqual(['AAA', 'BBB', 'CCC']);
    expect(c.ordemDe('placa')).toBe('asc');
    c.ordenar('placa');
    expect(c.veiculosFiltrados().map((v) => v.placa)).toEqual(['CCC', 'BBB', 'AAA']);
    expect(c.ordemDe('placa')).toBe('desc');
  });

  it('trocar de coluna volta para crescente e limpa a ordem da anterior', async () => {
    const c = await pagina();
    c.ordenar('placa');
    c.ordenar('id');
    expect(c.veiculosFiltrados().map((v) => v.id)).toEqual([1, 2, 3]);
    expect(c.ordemDe('placa')).toBeNull();
  });
});

// ADR 0003, fase 4 (D3): estado na URL, paginação no cliente, debounce da busca e "Reativar".
describe('VeiculosPage: URL, paginação e reativação', () => {
  const api = { listar: jest.fn(), reativar: jest.fn(), desativar: jest.fn() };
  const confirmacao = { confirmar: jest.fn() };
  const muitos = Array.from({ length: 57 }, (_, i) => ({
    id: i + 1,
    placa: `AAA${String(i + 1).padStart(4, '0')}`,
    modelo: i % 2 ? 'Scania' : 'Volvo',
    status: i === 4 ? StatusVeiculo.INATIVO : i === 5 ? StatusVeiculo.MANUTENCAO : StatusVeiculo.ATIVO,
  })) as Veiculo[];

  async function pagina(url = '') {
    TestBed.configureTestingModule({
      imports: [VeiculosPage],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: VeiculosApiService, useValue: api },
        { provide: ConfirmService, useValue: confirmacao },
      ],
    });
    const router = TestBed.inject(Router);
    if (url) await router.navigateByUrl(url);
    const c = TestBed.createComponent(VeiculosPage).componentInstance;
    await c.carregarVeiculos();
    return { c, router };
  }

  beforeEach(() => {
    jest.resetAllMocks();
    api.listar.mockReturnValue(of(muitos));
  });

  it('mostra 10 por página e informa a faixa', async () => {
    const { c } = await pagina();
    expect(c.pagina()).toMatchObject({ total: 57, pagina: 1, totalPaginas: 6, de: 1, ate: 10, tamanho: 10 });
    expect(c.pagina().itens).toHaveLength(10);
  });

  it('lê a página, o tamanho e a busca da URL ao abrir', async () => {
    const { c } = await pagina('/veiculos?pagina=2&tam=25&q=scania');
    expect(c.filtros()).toMatchObject({ pagina: 2, tam: 25, q: 'scania' });
    expect(c.pagina().total).toBe(28);
    expect(c.pagina()).toMatchObject({ pagina: 2, de: 26, ate: 28 });
  });

  it('URL editada à mão não quebra: página e tamanho inválidos caem no padrão', async () => {
    const { c } = await pagina('/veiculos?pagina=abc&tam=7&ordem=foo:bar&id=-3');
    expect(c.filtros()).toMatchObject({ pagina: 1, tam: 10, ordem: 'foo:bar', id: null });
    expect(c.ordemAtual()).toBeNull();
    expect(c.pagina().itens).toHaveLength(10);
  });

  it('página além do fim cai na última', async () => {
    const { c } = await pagina('/veiculos?pagina=99');
    expect(c.pagina().pagina).toBe(6);
    expect(c.pagina().itens).toHaveLength(7);
  });

  it('mudar filtro, tamanho ou ordem volta para a página 1 e grava na URL', async () => {
    const { c, router } = await pagina('/veiculos?pagina=3');
    await c.url.definir({ pagina: 3 });
    c.filtrarStatus('MANUTENCAO');
    expect(c.filtros().pagina).toBe(1);
    await new Promise((r) => setTimeout(r));
    expect(router.url).toContain('status=MANUTENCAO');
    expect(router.url).not.toContain('pagina=');
    c.mudarTamanho(25);
    c.ordenar('placa');
    expect(c.filtros()).toMatchObject({ tam: 25, pagina: 1, ordem: 'placa:asc' });
    await new Promise((r) => setTimeout(r));
    expect(router.url).toContain('tam=25');
    expect(router.url).toContain('ordem=placa:asc');
  });

  it('a busca só chega à URL depois de 250 ms parado, e troca a entrada do histórico', async () => {
    jest.useFakeTimers();
    try {
      const { c } = await pagina();
      c.digitar('v');
      c.digitar('vo');
      c.digitar('vol');
      jest.advanceTimersByTime(249);
      expect(c.filtros().q).toBe('');
      jest.advanceTimersByTime(2);
      expect(c.filtros().q).toBe('vol');
      expect(c.filtros().pagina).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('limpar filtros zera busca e status e só aparece quando há filtro', async () => {
    const { c } = await pagina('/veiculos?q=scania&status=ATIVO&pagina=2');
    expect(c.temFiltro()).toBe(true);
    c.limparFiltros();
    expect(c.filtros()).toMatchObject({ q: '', status: '', pagina: 1 });
    expect(c.temFiltro()).toBe(false);
  });

  it('o veículo aberto vem do ?id= da URL e fecha ao limpar', async () => {
    const { c } = await pagina('/veiculos?id=3');
    expect(c.veiculoSelecionado()?.placa).toBe('AAA0003');
    c.fecharDetalhe();
    expect(c.veiculoSelecionado()).toBeNull();
    c.selecionarVeiculo(muitos[9]);
    expect(c.filtros().id).toBe(10);
  });

  it('id de um veículo que não existe não abre nada', async () => {
    const { c } = await pagina('/veiculos?id=9999');
    expect(c.veiculoSelecionado()).toBeNull();
  });

  it('ordenação pela URL (placa desc) e pelo seletor das telas estreitas', async () => {
    const { c } = await pagina('/veiculos?ordem=placa:desc');
    expect(c.pagina().itens[0].placa).toBe('AAA0057');
    expect(c.ordemDe('placa')).toBe('desc');
    c.ordenarPor('modelo:asc');
    expect(c.ordemDe('modelo')).toBe('asc');
    expect(c.ordemDe('placa')).toBeNull();
  });

  describe('reativar', () => {
    const inativo = muitos[4];

    it('confirmada: chama PATCH reativar, recarrega e avisa', async () => {
      confirmacao.confirmar.mockResolvedValue(true);
      api.reativar.mockReturnValue(of({ ...inativo, status: StatusVeiculo.ATIVO }));
      const { c } = await pagina();
      await c.confirmarReativacao(inativo);
      expect(confirmacao.confirmar).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Reativar veículo' }));
      expect(confirmacao.confirmar.mock.calls[0][0].perigo).toBeFalsy();
      expect(api.reativar).toHaveBeenCalledWith(5);
      expect(api.listar).toHaveBeenCalledTimes(2);
      expect(TestBed.inject(ToastService).toasts().at(-1)?.mensagem).toContain('reativado');
    });

    it('cancelada: não chama a API', async () => {
      confirmacao.confirmar.mockResolvedValue(false);
      const { c } = await pagina();
      await c.confirmarReativacao(inativo);
      expect(api.reativar).not.toHaveBeenCalled();
    });

    it('falha: mostra o erro e não recarrega', async () => {
      confirmacao.confirmar.mockResolvedValue(true);
      api.reativar.mockReturnValue(throwError(() => new ApiError(500, 'Erro no servidor. Tente novamente.')));
      const { c } = await pagina();
      await c.confirmarReativacao(inativo);
      expect(c.erro()).toBe('Erro no servidor. Tente novamente.');
      expect(api.listar).toHaveBeenCalledTimes(1);
    });

    it('nunca reativa um veículo que não está INATIVO (a API o forçaria para ATIVO)', async () => {
      const { c } = await pagina();
      await c.confirmarReativacao(muitos[5]);
      expect(confirmacao.confirmar).not.toHaveBeenCalled();
      expect(api.reativar).not.toHaveBeenCalled();
    });
  });
});
