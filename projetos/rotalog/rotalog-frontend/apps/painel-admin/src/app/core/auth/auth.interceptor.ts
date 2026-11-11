import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const HOSTS_DAS_APIS = [environment.apiFrotasUrl, environment.apiEntregasUrl];

/**
 * Anexa `Authorization: Bearer` só nas chamadas às nossas APIs (nunca a terceiros) e, em 401,
 * encerra a sessão e leva ao login. Sem efeito enquanto `autenticacao.ativa` for false.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  if (!auth.ativa || !HOSTS_DAS_APIS.some((base) => req.url.startsWith(base))) {
    return next(req);
  }
  const token = auth.token();
  const comToken = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  const router = inject(Router);
  return next(comToken).pipe(
    catchError((erro: unknown) => {
      if (erro instanceof HttpErrorResponse && erro.status === 401) {
        auth.sair();
        router.navigate(['/login'], { queryParams: { retorno: router.url } });
      }
      return throwError(() => erro);
    })
  );
};
