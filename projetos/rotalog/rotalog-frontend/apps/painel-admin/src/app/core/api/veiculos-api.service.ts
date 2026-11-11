import { inject, Injectable } from '@angular/core';
import { map, Observable, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { veiculoDeApi, veiculoParaApi } from '../mappers';
import { Veiculo, VeiculoApi } from '../models';
import { ApiClient } from './api-client';

const BASE = environment.apiFrotasUrl;

@Injectable({ providedIn: 'root' })
export class VeiculosApiService {
  private readonly api = inject(ApiClient);
  private lista$: Observable<Veiculo[]> | null = null;

  /** Cache com shareReplay; é descartado em qualquer mutação ou falha. */
  listar(): Observable<Veiculo[]> {
    if (!this.lista$) {
      this.lista$ = this.api.get<VeiculoApi[]>(BASE, '/veiculos').pipe(
        map((lista) => lista.map(veiculoDeApi)),
        tap({ error: () => this.invalidar() }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.lista$;
  }

  criar(veiculo: Partial<Veiculo>): Observable<Veiculo> {
    return this.api
      .post<VeiculoApi>(BASE, '/veiculos', veiculoParaApi(veiculo))
      .pipe(map(veiculoDeApi), tap(() => this.invalidar()));
  }

  atualizar(id: number, veiculo: Partial<Veiculo>): Observable<Veiculo> {
    return this.api
      .put<VeiculoApi>(BASE, `/veiculos/${id}`, veiculoParaApi(veiculo))
      .pipe(map(veiculoDeApi), tap(() => this.invalidar()));
  }

  /** A API não tem DELETE: desativar é PATCH .../desativar (botão "Desativar", fase 8). */
  desativar(id: number): Observable<Veiculo> {
    return this.api
      .patch<VeiculoApi>(BASE, `/veiculos/${id}/desativar`)
      .pipe(map(veiculoDeApi), tap(() => this.invalidar()));
  }

  reativar(id: number): Observable<Veiculo> {
    return this.api
      .patch<VeiculoApi>(BASE, `/veiculos/${id}/reativar`)
      .pipe(map(veiculoDeApi), tap(() => this.invalidar()));
  }

  invalidar(): void {
    this.lista$ = null;
  }
}
