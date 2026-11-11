// Dívida técnica deste arquivo: docs/adr/0001-reorganizacao-seguranca-acessibilidade-painel-admin.md
import { Route } from '@angular/router';
import { authGuard, loginGuard } from './core/auth/auth.guard';

// Páginas carregadas sob demanda (lazy). O authGuard só barra quando environment.autenticacao.ativa for true.
export const appRoutes: Route[] = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    title: 'Dashboard · RotaLog',
    loadComponent: () =>
      import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'veiculos',
    canActivate: [authGuard],
    title: 'Veículos · RotaLog',
    loadComponent: () =>
      import('./features/veiculos/veiculos.page').then((m) => m.VeiculosPage),
  },
  {
    path: 'motoristas',
    canActivate: [authGuard],
    title: 'Motoristas · RotaLog',
    loadComponent: () =>
      import('./features/motoristas/motoristas.page').then((m) => m.MotoristasPage),
  },
  {
    path: 'manutencoes',
    canActivate: [authGuard],
    title: 'Manutenções · RotaLog',
    loadComponent: () =>
      import('./features/manutencoes/manutencoes.page').then((m) => m.ManutencoesPage),
  },
  {
    path: 'alertas-manutencao',
    canActivate: [authGuard],
    title: 'Alertas de manutenção · RotaLog',
    loadComponent: () =>
      import('./features/alertas-manutencao/alertas-manutencao.page').then(
        (m) => m.AlertasManutencaoPage
      ),
  },
  {
    path: 'entregas',
    canActivate: [authGuard],
    title: 'Entregas · RotaLog',
    loadComponent: () =>
      import('./features/entregas/entregas.page').then((m) => m.EntregasPage),
  },
  {
    path: 'login',
    title: 'Entrar · RotaLog',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '**',
    title: 'Página não encontrada · RotaLog',
    loadComponent: () =>
      import('./features/nao-encontrado/nao-encontrado.page').then(
        (m) => m.NaoEncontradoPage
      ),
  },
];
