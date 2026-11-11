import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Bloqueia as páginas sem sessão. Com a autenticação desligada, deixa tudo passar. */
export const authGuard: CanActivateFn = (_rota, estado) => {
  const auth = inject(AuthService);
  if (!auth.ativa || auth.autenticado()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { retorno: estado.url } });
};

/** A tela de login só existe com autenticação ligada e sem sessão. */
export const loginGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.ativa && !auth.autenticado()) return true;
  return inject(Router).createUrlTree(['/dashboard']);
};

/** Aceita só caminhos internos (evita open redirect via ?retorno=https://...). */
export function retornoSeguro(retorno: string | null | undefined): string {
  return retorno && /^\/(?![/\\])/.test(retorno) ? retorno : '/dashboard';
}
