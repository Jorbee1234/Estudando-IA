import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { entregaDeApi } from '../mappers';
import { Entrega, EntregaApi } from '../models';
import { ApiClient } from './api-client';

@Injectable({ providedIn: 'root' })
export class EntregasApiService {
  private readonly api = inject(ApiClient);

  listar(): Observable<Entrega[]> {
    return this.api
      .get<EntregaApi[]>(environment.apiEntregasUrl, '/entregas')
      .pipe(map((lista) => lista.map(entregaDeApi)));
  }

  /** A API filtra por motorista_id (não por "motorista"). */
  listarPorMotorista(motoristaId: number): Observable<Entrega[]> {
    return this.api
      .get<EntregaApi[]>(environment.apiEntregasUrl, '/entregas', {
        motorista_id: motoristaId,
      })
      .pipe(map((lista) => lista.map(entregaDeApi)));
  }
}
