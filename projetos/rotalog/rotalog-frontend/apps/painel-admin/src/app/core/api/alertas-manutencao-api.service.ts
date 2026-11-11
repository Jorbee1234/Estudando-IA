import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { alertaManutencaoDeApi } from '../mappers';
import {
  AlertaManutencao,
  AlertaManutencaoApi,
  ReprocessamentoAlertasApi,
  VerificacaoAlertasApi,
} from '../models';
import { ApiClient } from './api-client';

export interface FiltroAlertas {
  status?: string;
  veiculoId?: number;
}

@Injectable({ providedIn: 'root' })
export class AlertasManutencaoApiService {
  private readonly api = inject(ApiClient);

  listar(filtro: FiltroAlertas = {}): Observable<AlertaManutencao[]> {
    const params: Record<string, string | number> = {};
    if (filtro.status) params['status'] = filtro.status;
    if (filtro.veiculoId) params['veiculoId'] = filtro.veiculoId;
    return this.api
      .get<AlertaManutencaoApi[]>(environment.apiFrotasUrl, '/alertas-manutencao', params)
      .pipe(map((lista) => lista.map(alertaManutencaoDeApi)));
  }

  verificar(): Observable<{ criados: number; alertas: AlertaManutencao[] }> {
    return this.api
      .post<VerificacaoAlertasApi>(environment.apiFrotasUrl, '/alertas-manutencao/verificar', {})
      .pipe(
        map((r) => ({
          criados: r.criados ?? 0,
          alertas: (r.alertas ?? []).map(alertaManutencaoDeApi),
        }))
      );
  }

  reprocessar(): Observable<ReprocessamentoAlertasApi> {
    return this.api.post<ReprocessamentoAlertasApi>(
      environment.apiFrotasUrl,
      '/alertas-manutencao/reprocessar',
      {}
    );
  }
}
