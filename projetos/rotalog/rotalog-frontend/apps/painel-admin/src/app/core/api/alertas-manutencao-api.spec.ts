import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { alertaManutencaoDeApi } from '../mappers';
import { AlertaManutencaoApi, StatusAlertaManutencao, TipoAlertaManutencao } from '../models';
import { ApiError } from './api-error';
import { AlertasManutencaoApiService } from './alertas-manutencao-api.service';

const FROTAS = environment.apiFrotasUrl;

const apiAlerta: AlertaManutencaoApi = {
  id: 7,
  veiculoId: 2,
  placa: 'ABC1D23',
  modelo: 'Volvo FH',
  tipoAlerta: 'KM',
  motivo: 'Mais de 10.000 km desde a última manutenção',
  kmAtual: 120000,
  kmBase: 100000,
  dataBase: '2026-01-10',
  statusNotificacao: 'ENVIADO',
  notificacaoId: 55,
  tentativas: 1,
  erro: null,
  dataCriacao: '2026-11-01T10:00:00',
  dataAtualizacao: '2026-11-01T10:00:02',
};

describe('alertaManutencaoDeApi', () => {
  it('converte o contrato da API para o modelo do painel', () => {
    expect(alertaManutencaoDeApi(apiAlerta)).toEqual({
      id: 7,
      veiculo_id: 2,
      placa: 'ABC1D23',
      modelo: 'Volvo FH',
      tipo: TipoAlertaManutencao.KM,
      motivo: 'Mais de 10.000 km desde a última manutenção',
      km_atual: 120000,
      km_base: 100000,
      data_base: '2026-01-10',
      status: StatusAlertaManutencao.ENVIADO,
      notificacao_id: 55,
      tentativas: 1,
      erro: '',
      created_at: '2026-11-01T10:00:00',
      updated_at: '2026-11-01T10:00:02',
    });
  });

  it('tolera nulos e caixa baixa; status desconhecido é mantido', () => {
    const a = alertaManutencaoDeApi({
      ...apiAlerta,
      placa: null,
      kmAtual: null,
      notificacaoId: null,
      tentativas: null,
      statusNotificacao: ' falha ',
      tipoAlerta: 'data',
    });
    expect(a).toMatchObject({
      placa: '',
      km_atual: 0,
      notificacao_id: null,
      tentativas: 0,
      status: 'FALHA',
      tipo: 'DATA',
    });
    expect(alertaManutencaoDeApi({ ...apiAlerta, statusNotificacao: 'NOVO' }).status).toBe('NOVO');
    expect(alertaManutencaoDeApi({ ...apiAlerta, statusNotificacao: null }).status).toBe('PENDENTE');
  });
});

describe('AlertasManutencaoApiService', () => {
  let http: HttpTestingController;
  let service: AlertasManutencaoApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AlertasManutencaoApiService);
  });

  afterEach(() => http.verify());

  it('lista em GET /alertas-manutencao e aplica o mapper', async () => {
    const p = firstValueFrom(service.listar());
    const req = http.expectOne(`${FROTAS}/alertas-manutencao`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush([apiAlerta]);
    expect((await p)[0]).toMatchObject({ veiculo_id: 2, status: 'ENVIADO' });
  });

  it('envia status e veiculoId como query params', async () => {
    const p = firstValueFrom(service.listar({ status: 'FALHA', veiculoId: 3 }));
    const req = http.expectOne((r) => r.url === `${FROTAS}/alertas-manutencao`);
    expect(req.request.params.get('status')).toBe('FALHA');
    expect(req.request.params.get('veiculoId')).toBe('3');
    req.flush([]);
    await p;
  });

  it('verificar chama POST /alertas-manutencao/verificar', async () => {
    const p = firstValueFrom(service.verificar());
    const req = http.expectOne(`${FROTAS}/alertas-manutencao/verificar`);
    expect(req.request.method).toBe('POST');
    req.flush({ criados: 1, alertas: [apiAlerta] });
    const r = await p;
    expect(r.criados).toBe(1);
    expect(r.alertas[0].placa).toBe('ABC1D23');
  });

  it('reprocessar chama POST /alertas-manutencao/reprocessar', async () => {
    const p = firstValueFrom(service.reprocessar());
    const req = http.expectOne(`${FROTAS}/alertas-manutencao/reprocessar`);
    expect(req.request.method).toBe('POST');
    req.flush({ reprocessados: 3, enviados: 2 });
    expect(await p).toEqual({ reprocessados: 3, enviados: 2 });
  });

  it('500 vira ApiError (nunca lista vazia)', async () => {
    const p = firstValueFrom(service.listar());
    http.expectOne(`${FROTAS}/alertas-manutencao`).flush('', { status: 500, statusText: 'E' });
    await expect(p).rejects.toBeInstanceOf(ApiError);
  });
});
