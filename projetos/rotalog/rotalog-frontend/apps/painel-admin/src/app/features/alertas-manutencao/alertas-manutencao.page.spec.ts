import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AlertasManutencaoApiService } from '../../core/api/alertas-manutencao-api.service';
import { ApiError } from '../../core/api/api-error';
import { AlertaManutencao, StatusAlertaManutencao } from '../../core/models';
import { ToastService } from '../../core/notification/toast.service';
import { AlertasManutencaoPage } from './alertas-manutencao.page';

describe('AlertasManutencaoPage', () => {
  const api = { listar: jest.fn(), verificar: jest.fn(), reprocessar: jest.fn() };
  const lista = [
    { id: 1, placa: 'AAA1111', status: StatusAlertaManutencao.PENDENTE },
    { id: 2, placa: 'BBB2222', status: StatusAlertaManutencao.ENVIADO },
    { id: 3, placa: 'AAA3333', status: StatusAlertaManutencao.FALHA },
  ] as AlertaManutencao[];
  const falha = () => throwError(() => new ApiError(500, 'Erro no servidor. Tente novamente.'));

  async function pagina(url = '') {
    TestBed.configureTestingModule({
      imports: [AlertasManutencaoPage],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: AlertasManutencaoApiService, useValue: api },
      ],
    });
    const router = TestBed.inject(Router);
    if (url) await router.navigateByUrl(url);
    const c = TestBed.createComponent(AlertasManutencaoPage).componentInstance;
    await c.carregar();
    return { c, router };
  }

  const ultimoToast = () => TestBed.inject(ToastService).toasts().at(-1);

  beforeEach(() => {
    jest.resetAllMocks();
    api.listar.mockReturnValue(of(lista));
  });

  it('carrega a lista e termina o loading', async () => {
    const { c } = await pagina();
    expect(c.alertas()).toHaveLength(3);
    expect(c.loading()).toBe(false);
    expect(c.erro()).toBeNull();
  });

  it('API fora do ar: erro visível e lista vazia', async () => {
    api.listar.mockReturnValue(falha());
    const { c } = await pagina();
    expect(c.erro()).toBe('Erro no servidor. Tente novamente.');
    expect(c.alertas()).toEqual([]);
    expect(c.loading()).toBe(false);
  });

  it('filtra por status e por placa, a partir da URL', async () => {
    const { c } = await pagina('/alertas-manutencao?status=FALHA');
    expect(c.alertasFiltrados().map((a) => a.id)).toEqual([3]);
    await c.url.definir({ status: '', q: 'aaa' });
    expect(c.alertasFiltrados().map((a) => a.id)).toEqual([1, 3]);
    await c.url.definir({ status: 'PENDENTE' });
    expect(c.alertasFiltrados().map((a) => a.id)).toEqual([1]);
    expect(c.temFiltro()).toBe(true);
  });

  it('filtrar status volta para a página 1 e grava na URL; limpar zera', async () => {
    const { c, router } = await pagina('/alertas-manutencao?pagina=3');
    c.filtrarStatus('ENVIADO');
    expect(c.filtros().pagina).toBe(1);
    await new Promise((r) => setTimeout(r));
    expect(router.url).toContain('status=ENVIADO');
    c.limparFiltros();
    expect(c.temFiltro()).toBe(false);
  });

  it('Verificar agora: chama a API, avisa e recarrega a lista', async () => {
    api.verificar.mockReturnValue(of({ criados: 2, alertas: [] }));
    const { c } = await pagina();
    await c.verificarAgora();
    expect(api.verificar).toHaveBeenCalled();
    expect(api.listar).toHaveBeenCalledTimes(2);
    expect(ultimoToast()).toMatchObject({ tipo: 'sucesso' });
    expect(ultimoToast()?.mensagem).toContain('2');
    expect(c.acao()).toBeNull();
  });

  it('Verificar agora sem elegíveis informa que nada foi criado', async () => {
    api.verificar.mockReturnValue(of({ criados: 0, alertas: [] }));
    const { c } = await pagina();
    await c.verificarAgora();
    expect(ultimoToast()?.mensagem).toContain('nenhum veículo novo');
  });

  it('Verificar agora que falha mostra toast de erro e não recarrega', async () => {
    api.verificar.mockReturnValue(falha());
    const { c } = await pagina();
    await c.verificarAgora();
    expect(ultimoToast()).toMatchObject({ tipo: 'erro', mensagem: 'Erro no servidor. Tente novamente.' });
    expect(api.listar).toHaveBeenCalledTimes(1);
    expect(c.acao()).toBeNull();
  });

  it('Reenviar pendentes: avisa enviados/reprocessados e recarrega', async () => {
    api.reprocessar.mockReturnValue(of({ reprocessados: 3, enviados: 2 }));
    const { c } = await pagina();
    await c.reenviarPendentes();
    expect(api.reprocessar).toHaveBeenCalled();
    expect(ultimoToast()?.mensagem).toContain('2 de 3');
    expect(api.listar).toHaveBeenCalledTimes(2);
  });

  it('Reenviar pendentes sem pendências informa isso', async () => {
    api.reprocessar.mockReturnValue(of({ reprocessados: 0, enviados: 0 }));
    const { c } = await pagina();
    await c.reenviarPendentes();
    expect(ultimoToast()?.mensagem).toContain('Não há alertas pendentes');
  });

  it('Reenviar pendentes que falha mostra toast de erro', async () => {
    api.reprocessar.mockReturnValue(falha());
    const { c } = await pagina();
    await c.reenviarPendentes();
    expect(ultimoToast()?.tipo).toBe('erro');
    expect(api.listar).toHaveBeenCalledTimes(1);
  });
});
