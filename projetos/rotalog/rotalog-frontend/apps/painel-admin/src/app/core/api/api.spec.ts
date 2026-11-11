import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StatusVeiculo } from '../models';
import { ApiClient } from './api-client';
import { ApiError } from './api-error';
import { EntregasApiService } from './entregas-api.service';
import { ManutencoesApiService } from './manutencoes-api.service';
import { MotoristasApiService } from './motoristas-api.service';
import { VeiculosApiService } from './veiculos-api.service';

const FROTAS = environment.apiFrotasUrl;
const ENTREGAS = environment.apiEntregasUrl;

describe('camada de API (ADR 0001, fase 4)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('ApiClient: erro tipado, nunca []', () => {
    it('404 vira ApiError com status e mensagem', async () => {
      const p = firstValueFrom(TestBed.inject(ApiClient).get(FROTAS, '/x'));
      http.expectOne(`${FROTAS}/x`).flush({}, { status: 404, statusText: 'NF' });
      await expect(p).rejects.toMatchObject({
        status: 404,
        mensagem: 'Não encontrado.',
      });
    });

    it('500 vira ApiError', async () => {
      const p = firstValueFrom(TestBed.inject(ApiClient).get(FROTAS, '/x'));
      http.expectOne(`${FROTAS}/x`).flush('', { status: 500, statusText: 'E' });
      await expect(p).rejects.toBeInstanceOf(ApiError);
    });

    it('usa a mensagem do corpo quando a API manda uma', async () => {
      const p = firstValueFrom(TestBed.inject(ApiClient).post(FROTAS, '/x', {}));
      http
        .expectOne(`${FROTAS}/x`)
        .flush(
          { mensagem: 'Ano de fabricação inválido' },
          { status: 400, statusText: 'BR' }
        );
      await expect(p).rejects.toMatchObject({
        status: 400,
        mensagem: 'Ano de fabricação inválido',
      });
    });

    it('erro de rede vira status 0 com mensagem de conexão', async () => {
      const p = firstValueFrom(TestBed.inject(ApiClient).get(FROTAS, '/x'));
      http.expectOne(`${FROTAS}/x`).error(new ProgressEvent('error'));
      await expect(p).rejects.toMatchObject({ status: 0 });
    });

    it('estoura o tempo e vira 408', fakeAsync(() => {
      let erro: ApiError | undefined;
      TestBed.inject(ApiClient)
        .get(FROTAS, '/lento')
        .subscribe({ error: (e) => (erro = e) });
      http.expectOne(`${FROTAS}/lento`);
      tick(environment.timeoutMs + 1);
      expect(erro?.status).toBe(408);
    }));
  });

  describe('VeiculosApiService', () => {
    const apiVeiculo = {
      id: 1,
      placa: 'ABC1D23',
      modelo: 'Volvo',
      anoFabricacao: 2021,
      quilometragem: 10,
      status: 'MANUTENCAO',
    };

    it('lista em GET /api/veiculos e aplica o mapper', async () => {
      const p = firstValueFrom(TestBed.inject(VeiculosApiService).listar());
      const req = http.expectOne(`${FROTAS}/veiculos`);
      expect(req.request.method).toBe('GET');
      req.flush([apiVeiculo]);
      const [v] = await p;
      expect(v).toMatchObject({ ano: 2021, km_atual: 10, status: StatusVeiculo.MANUTENCAO });
    });

    it('guarda em cache (shareReplay) e a criação invalida', async () => {
      const s = TestBed.inject(VeiculosApiService);
      const p1 = firstValueFrom(s.listar());
      http.expectOne(`${FROTAS}/veiculos`).flush([apiVeiculo]);
      await p1;
      await firstValueFrom(s.listar()); // cache: sem nova requisição

      const criar = firstValueFrom(s.criar({ placa: 'ABC1D23', modelo: 'V', ano: 2021, km_atual: 0 }));
      const post = http.expectOne(`${FROTAS}/veiculos`);
      expect(post.request.method).toBe('POST');
      post.flush(apiVeiculo);
      await criar;

      const p2 = firstValueFrom(s.listar());
      http.expectOne(`${FROTAS}/veiculos`).flush([]);
      await p2;
    });

    it('POST leva anoFabricacao e quilometragem', async () => {
      const p = firstValueFrom(
        TestBed.inject(VeiculosApiService).criar({ placa: 'ABC1D23', modelo: 'V', ano: 2021, km_atual: 5 })
      );
      const req = http.expectOne(`${FROTAS}/veiculos`);
      expect(req.request.body).toEqual({
        placa: 'ABC1D23',
        modelo: 'V',
        anoFabricacao: 2021,
        quilometragem: 5,
      });
      req.flush(apiVeiculo);
      await p;
    });

    it('atualizar usa PUT em /veiculos/{id}', async () => {
      const p = firstValueFrom(TestBed.inject(VeiculosApiService).atualizar(3, { placa: 'A', modelo: 'B' }));
      const req = http.expectOne(`${FROTAS}/veiculos/3`);
      expect(req.request.method).toBe('PUT');
      req.flush(apiVeiculo);
      await p;
    });

    it('desativar chama PATCH /veiculos/{id}/desativar', async () => {
      const p = firstValueFrom(TestBed.inject(VeiculosApiService).desativar(3));
      const req = http.expectOne(`${FROTAS}/veiculos/3/desativar`);
      expect(req.request.method).toBe('PATCH');
      req.flush({ ...apiVeiculo, status: 'INATIVO' });
      expect((await p).status).toBe(StatusVeiculo.INATIVO);
    });

    it('falha de API não é cacheada: a próxima chamada tenta de novo', async () => {
      const s = TestBed.inject(VeiculosApiService);
      const p1 = firstValueFrom(s.listar());
      http.expectOne(`${FROTAS}/veiculos`).flush('', { status: 500, statusText: 'E' });
      await expect(p1).rejects.toBeInstanceOf(ApiError);
      const p2 = firstValueFrom(s.listar());
      http.expectOne(`${FROTAS}/veiculos`).flush([]);
      await p2;
    });
  });

  describe('MotoristasApiService', () => {
    it('envia vencimentoCnh (antes a validade nunca chegava)', async () => {
      const p = firstValueFrom(
        TestBed.inject(MotoristasApiService).criar({
          nome: 'A',
          cnh: '1',
          categoria_cnh: 'B',
          validade_cnh: '2030-01-01',
        })
      );
      const req = http.expectOne(`${FROTAS}/motoristas`);
      expect(req.request.body).toMatchObject({ categoriaCnh: 'B', vencimentoCnh: '2030-01-01' });
      req.flush({ id: 1, nome: 'A', cnh: '1', categoriaCnh: 'B', vencimentoCnh: '2030-01-01', status: 'ATIVO' });
      await p;
    });
  });

  describe('ManutencoesApiService', () => {
    it('lista em GET /api/manutencoes', async () => {
      const p = firstValueFrom(TestBed.inject(ManutencoesApiService).listar());
      http.expectOne(`${FROTAS}/manutencoes`).flush([
        { id: 1, veiculoId: 2, tipoManutencao: 'REVISAO', dataManutencao: null, quilometragemManutencao: null, custo: null, descricao: null, status: 'PENDENTE' },
      ]);
      expect((await p)[0]).toMatchObject({ veiculo_id: 2, status: 'PENDENTE' });
    });
  });

  describe('EntregasApiService', () => {
    it('lista em GET :3000/api/entregas sem cabeçalho Authorization e mostra numero_pedido', async () => {
      const p = firstValueFrom(TestBed.inject(EntregasApiService).listar());
      const req = http.expectOne(`${ENTREGAS}/entregas`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush([
        { id: 1, numero_pedido: 'PED-1', status: 'PENDENTE', origem_endereco: 'a', destino_endereco: 'b' },
      ]);
      expect((await p)[0].codigo_rastreio).toBe('PED-1');
    });

    it('401 (api-entregas exige token em produção) vira erro visível, não lista vazia', async () => {
      const p = firstValueFrom(TestBed.inject(EntregasApiService).listar());
      http.expectOne(`${ENTREGAS}/entregas`).flush({}, { status: 401, statusText: 'U' });
      await expect(p).rejects.toMatchObject({ status: 401 });
    });

    it('filtra por motorista_id', async () => {
      const p = firstValueFrom(TestBed.inject(EntregasApiService).listarPorMotorista(4));
      const req = http.expectOne((r) => r.url === `${ENTREGAS}/entregas`);
      expect(req.request.params.get('motorista_id')).toBe('4');
      req.flush([]);
      await p;
    });
  });
});
