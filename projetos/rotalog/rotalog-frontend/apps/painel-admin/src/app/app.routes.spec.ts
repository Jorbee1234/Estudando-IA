import { appRoutes } from './app.routes';

// Contrato a preservar (ADR 0001 §8): rotas e redirect da raiz. Páginas em lazy loading.
describe('appRoutes', () => {
  it('mantém as 5 rotas do painel, todas com loadComponent e título', () => {
    for (const path of ['dashboard', 'veiculos', 'motoristas', 'manutencoes', 'alertas-manutencao', 'entregas']) {
      expect(appRoutes.find((r) => r.path === path)?.canActivate).toHaveLength(1);
      const rota = appRoutes.find((r) => r.path === path);
      expect(rota?.loadComponent).toBeInstanceOf(Function);
      expect(rota?.title).toContain('RotaLog');
    }
  });

  it('redireciona a raiz para o dashboard', () => {
    expect(appRoutes.find((r) => r.path === '')?.redirectTo).toBe('dashboard');
  });

  it('o wildcard abre uma página 404 (não redireciona mais)', async () => {
    const rota = appRoutes.find((r) => r.path === '**');
    expect(rota?.redirectTo).toBeUndefined();
    const comp = await (rota?.loadComponent as () => Promise<unknown>)();
    expect((comp as { name: string }).name).toBe('NaoEncontradoPage');
  });

  it('cada rota carrega o componente certo', async () => {
    const esperado: Record<string, string> = {
      dashboard: 'DashboardPage',
      veiculos: 'VeiculosPage',
      motoristas: 'MotoristasPage',
      manutencoes: 'ManutencoesPage',
      'alertas-manutencao': 'AlertasManutencaoPage',
      entregas: 'EntregasPage',
    };
    for (const [path, nome] of Object.entries(esperado)) {
      const rota = appRoutes.find((r) => r.path === path);
      const comp = await (rota?.loadComponent as () => Promise<{ name: string }>)();
      expect(comp.name).toBe(nome);
    }
  });
});
