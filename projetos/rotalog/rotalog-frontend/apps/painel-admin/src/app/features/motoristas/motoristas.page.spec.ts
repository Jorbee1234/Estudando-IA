import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { MotoristasApiService } from '../../core/api/motoristas-api.service';
import { Motorista, StatusMotorista } from '../../core/models';
import { MotoristasPage } from './motoristas.page';

// ADR 0001, fase 6: formulário reativo tipado, erro no campo e sem alert().
describe('MotoristasPage', () => {
  const api = { listar: jest.fn(), criar: jest.fn(), atualizar: jest.fn() };
  const lista = [
    { id: 1, nome: 'Ana', cnh: '123', status: StatusMotorista.ATIVO },
    { id: 2, nome: 'Bruno', cnh: '456', status: StatusMotorista.FERIAS },
  ] as Motorista[];

  function criar() {
    TestBed.configureTestingModule({
      imports: [MotoristasPage],
      providers: [provideRouter([{ path: '**', children: [] }]), { provide: MotoristasApiService, useValue: api }],
    });
    return TestBed.createComponent(MotoristasPage).componentInstance;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    api.listar.mockReturnValue(of(lista));
    window.alert = jest.fn();
  });

  it('filtra por nome/CNH e por status', async () => {
    const c = criar();
    await c.carregarMotoristas();
    c.url.definir({ q: 'bru' });
    expect(c.motoristasFiltrados().map((m) => m.id)).toEqual([2]);
    c.url.definir({ q: '123' });
    expect(c.motoristasFiltrados().map((m) => m.id)).toEqual([1]);
    c.url.definir({ q: '', status: 'FERIAS' });
    expect(c.motoristasFiltrados().map((m) => m.id)).toEqual([2]);
  });

  it('envio sem nome/CNH mostra o erro nos campos e não chama a API nem alert()', async () => {
    const c = criar();
    c.mostrarFormulario();
    await c.salvarMotorista(new Event('submit'));
    expect(c.erroDe('nome')).toBe('Campo obrigatório.');
    expect(c.erroDe('cnh')).toBe('Campo obrigatório.');
    expect(api.criar).not.toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('o erro só aparece depois de tocar no campo ou tentar enviar', () => {
    const c = criar();
    c.mostrarFormulario();
    expect(c.erroDe('nome')).toBeNull();
    c.form.controls.nome.markAsTouched();
    expect(c.erroDe('nome')).toBe('Campo obrigatório.');
  });

  it('criação envia a validade da CNH e fecha o formulário', async () => {
    api.criar.mockReturnValue(of(lista[0]));
    const c = criar();
    c.mostrarFormulario();
    c.form.patchValue({ nome: 'Carla', cnh: '789', validade_cnh: '2030-01-01' });
    await c.salvarMotorista(new Event('submit'));
    expect(api.criar).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Carla', validade_cnh: '2030-01-01' }));
    expect(c.mostrandoForm()).toBe(false);
  });

  it('falha de API mantém o formulário aberto e mostra o erro', async () => {
    api.criar.mockReturnValue(throwError(() => new ApiError(500, 'Erro no servidor. Tente novamente.')));
    const c = criar();
    c.mostrarFormulario();
    c.form.patchValue({ nome: 'Carla', cnh: '789' });
    await c.salvarMotorista(new Event('submit'));
    expect(c.mostrandoForm()).toBe(true);
    expect(c.erro()).toBe('Erro no servidor. Tente novamente.');
    expect(c.form.controls.nome.value).toBe('Carla');
  });

  it('edição chama atualizar com o id e preserva os campos do motorista', async () => {
    api.atualizar.mockReturnValue(of(lista[0]));
    const c = criar();
    c.editarMotorista(lista[0]);
    await c.salvarMotorista(new Event('submit'));
    expect(api.atualizar).toHaveBeenCalledWith(1, expect.objectContaining({ id: 1, nome: 'Ana', cnh: '123' }));
  });

  it('CNH vencida é calculada a partir de validade_cnh', () => {
    const c = criar();
    expect(c.isCnhVencida({ validade_cnh: '2000-01-01' } as Motorista)).toBe(true);
    expect(c.isCnhVencida({ validade_cnh: '2999-01-01' } as Motorista)).toBe(false);
    expect(c.isCnhVencida({} as Motorista)).toBe(false);
  });

  // ADR 0003, fase 4: estado na URL e paginação.
  describe('URL e paginação', () => {
    const muitos = Array.from({ length: 23 }, (_, i) => ({
      id: i + 1,
      nome: `Motorista ${i + 1}`,
      cnh: String(1000 + i),
      status: i % 5 === 0 ? StatusMotorista.FERIAS : StatusMotorista.ATIVO,
    })) as Motorista[];

    async function abrir(url = '') {
      api.listar.mockReturnValue(of(muitos));
      const c = criar();
      if (url) await TestBed.inject(Router).navigateByUrl(url);
      await c.carregarMotoristas();
      return c;
    }

    it('mostra 10 por página e informa a faixa', async () => {
      const c = await abrir();
      expect(c.pagina()).toMatchObject({ total: 23, totalPaginas: 3, de: 1, ate: 10 });
      expect(c.pagina().itens).toHaveLength(10);
    });

    it('lê página, tamanho, busca e status da URL ao abrir', async () => {
      const c = await abrir('/motoristas?pagina=2&tam=10&status=FERIAS');
      expect(c.filtros()).toMatchObject({ pagina: 2, tam: 10, status: 'FERIAS' });
      expect(c.pagina().total).toBe(5);
      expect(c.pagina().pagina).toBe(1); // só há uma página de férias: a URL cai na última
    });

    it('filtrar volta para a página 1 e limpar filtros zera busca e status', async () => {
      const c = await abrir('/motoristas?pagina=3');
      expect(c.pagina().pagina).toBe(3);
      c.filtrarStatus('FERIAS');
      expect(c.filtros().pagina).toBe(1);
      expect(c.temFiltro()).toBe(true);
      c.limparFiltros();
      expect(c.filtros()).toMatchObject({ q: '', status: '', pagina: 1 });
      expect(c.temFiltro()).toBe(false);
    });

    it('a busca só chega à URL depois de 250 ms parado', async () => {
      jest.useFakeTimers();
      try {
        const c = await abrir();
        c.digitar('Mot');
        c.digitar('Moto');
        jest.advanceTimersByTime(249);
        expect(c.filtros().q).toBe('');
        jest.advanceTimersByTime(2);
        expect(c.filtros().q).toBe('Moto');
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
