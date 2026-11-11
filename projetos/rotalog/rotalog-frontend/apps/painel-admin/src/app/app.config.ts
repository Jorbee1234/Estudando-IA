import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler, provideZoneChangeDetection } from '@angular/core';
import { ActivatedRouteSnapshot, provideRouter, withViewTransitions } from '@angular/router';
import { appRoutes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { GlobalErrorHandler } from './core/notification/global-error-handler';

/**
 * Caminho da tela, sem a query ("veiculos", "dashboard"). O snapshot que o router entrega é a raiz
 * (caminho vazio): é preciso descer até a rota mais profunda.
 */
const caminho = (raiz: ActivatedRouteSnapshot) => {
  let folha = raiz;
  while (folha.firstChild) folha = folha.firstChild;
  return folha.pathFromRoot.flatMap((s) => s.url.map((u) => u.path)).join('/');
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Transição suave só no conteúdo (shell.css). Pulada com prefers-reduced-motion e na 1ª carga.
    provideRouter(
      appRoutes,
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          const reduzido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
          // Mudar só a query (página, filtro, item aberto) não é trocar de tela: sem transição. Animar
          // alongaria cada navegação e dois cliques rápidos cancelariam a anterior, perdendo uma
          // entrada do histórico.
          if (reduzido || caminho(from) === caminho(to)) transition.skipTransition();
        },
      })
    ),
    // Erros de API já chegam tipados (ApiError) pelo ApiClient, então não há interceptor de erro.
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
