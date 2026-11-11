import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { motoristaDeApi, motoristaParaApi } from '../mappers';
import { Motorista, MotoristaApi } from '../models';
import { ApiClient } from './api-client';

const BASE = environment.apiFrotasUrl;

@Injectable({ providedIn: 'root' })
export class MotoristasApiService {
  private readonly api = inject(ApiClient);
  private lista$: Observable<Motorista[]> | null = null;

  listar(): Observable<Motorista[]> {
    if (!this.lista$) {
      this.lista$ = this.api.get<MotoristaApi[]>(BASE, '/motoristas').pipe(
        map((lista) => lista.map(motoristaDeApi)),
        tap({ error: () => this.invalidar() }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.lista$;
  }

  criar(motorista: Partial<Motorista>): Observable<Motorista> {
    return this.api
      .post<MotoristaApi>(BASE, '/motoristas', motoristaParaApi(motorista))
      .pipe(map(motoristaDeApi), tap(() => this.invalidar()));
  }

  atualizar(id: number, motorista: Partial<Motorista>): Observable<Motorista> {
    return this.api
      .put<MotoristaApi>(
        BASE,
        `/motoristas/${id}`,
        motoristaParaApi(motorista)
      )
      .pipe(map(motoristaDeApi), tap(() => this.invalidar()));
  }

  invalidar(): void {
    this.lista$ = null;
  }
}
