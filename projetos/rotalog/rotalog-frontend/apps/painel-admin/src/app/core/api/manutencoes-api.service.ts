import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { manutencaoDeApi } from '../mappers';
import { Manutencao, ManutencaoApi } from '../models';
import { ApiClient } from './api-client';

@Injectable({ providedIn: 'root' })
export class ManutencoesApiService {
  private readonly api = inject(ApiClient);

  listar(): Observable<Manutencao[]> {
    return this.api
      .get<ManutencaoApi[]>(environment.apiFrotasUrl, '/manutencoes')
      .pipe(map((lista) => lista.map(manutencaoDeApi)));
  }
}
