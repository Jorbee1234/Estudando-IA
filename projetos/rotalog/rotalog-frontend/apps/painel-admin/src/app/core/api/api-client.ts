import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiError } from './api-error';

type Params = Record<string, string | number>;

/**
 * Wrapper do HttpClient (ADR 0001, D2). Não engole erro: toda falha vira
 * ApiError. Cada serviço de recurso informa a URL base (environment).
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  get<T>(base: string, caminho: string, params?: Params): Observable<T> {
    return this.executar(
      this.http.get<T>(`${base}${caminho}`, {
        params: new HttpParams({ fromObject: params ?? {} }),
      })
    );
  }

  post<T>(base: string, caminho: string, corpo: unknown): Observable<T> {
    return this.executar(this.http.post<T>(`${base}${caminho}`, corpo));
  }

  put<T>(base: string, caminho: string, corpo: unknown): Observable<T> {
    return this.executar(this.http.put<T>(`${base}${caminho}`, corpo));
  }

  patch<T>(base: string, caminho: string, corpo: unknown = {}): Observable<T> {
    return this.executar(this.http.patch<T>(`${base}${caminho}`, corpo));
  }

  delete<T>(base: string, caminho: string): Observable<T> {
    return this.executar(this.http.delete<T>(`${base}${caminho}`));
  }

  private executar<T>(requisicao: Observable<T>): Observable<T> {
    return requisicao.pipe(
      timeout(environment.timeoutMs),
      catchError((e) => throwError(() => ApiError.de(e)))
    );
  }
}
