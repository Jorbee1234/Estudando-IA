import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router, UrlTree } from '@angular/router';
import { environment } from '../../../environments/environment';
import { LoginPage } from '../../features/login/login.page';
import { authInterceptor } from './auth.interceptor';
import { authGuard, loginGuard, retornoSeguro } from './auth.guard';
import { AuthService, expiracaoDoToken, nomeDoToken } from './auth.service';

// ADR 0001, fase 8 (D5b): auth pronta, mas desligada por environment.
function jwt(exp?: number): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(exp === undefined ? {} : { exp })}.assinatura`;
}
const daqui = (ms: number) => Math.floor((Date.now() + ms) / 1000);

const auth = environment.autenticacao;
const original = { ...auth };

function configurar(ativa: boolean, loginUrl = 'http://login.test/token') {
  auth.ativa = ativa;
  auth.loginUrl = loginUrl;
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])),
      provideHttpClientTesting(),
    ],
  });
}

afterEach(() => {
  Object.assign(auth, original);
  sessionStorage.clear();
});

describe('autenticação desligada (padrão)', () => {
  it('vem desligada nos dois environments', () => {
    expect(original.ativa).toBe(false);
  });

  it('o interceptor não mexe na requisição e o guard deixa passar', () => {
    configurar(false);
    sessionStorage.clear();
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);
    http.get(`${environment.apiFrotasUrl}/veiculos`).subscribe();
    expect(ctrl.expectOne(`${environment.apiFrotasUrl}/veiculos`).request.headers.has('Authorization')).toBe(false);
    expect(TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/veiculos' } as never))).toBe(true);
  });

  it('a tela de login redireciona ao dashboard', () => {
    configurar(false);
    const r = TestBed.runInInjectionContext(() => loginGuard({} as never, {} as never)) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(r)).toBe('/dashboard');
  });
});

describe('expiracaoDoToken', () => {
  it('lê o exp em ms; devolve null sem exp ou com token malformado', () => {
    expect(expiracaoDoToken(jwt(1000))).toBe(1_000_000);
    expect(expiracaoDoToken(jwt())).toBeNull();
    expect(expiracaoDoToken('lixo')).toBeNull();
  });
});

describe('AuthService (ligado)', () => {
  it('login guarda o token, autentica e persiste na sessão; sair limpa tudo', () => {
    configurar(true);
    const s = TestBed.inject(AuthService);
    const ctrl = TestBed.inject(HttpTestingController);
    expect(s.autenticado()).toBe(false);
    const token = jwt(daqui(60_000));
    s.login('ana', 'segredo').subscribe();
    const req = ctrl.expectOne('http://login.test/token');
    expect(req.request.body).toEqual({ usuario: 'ana', senha: 'segredo' });
    req.flush({ token });
    expect(s.autenticado()).toBe(true);
    expect(sessionStorage.getItem('rotalog.token')).toBe(token);
    s.sair();
    expect(s.autenticado()).toBe(false);
    expect(sessionStorage.getItem('rotalog.token')).toBeNull();
  });

  it('token expirado não conta como sessão', () => {
    sessionStorage.setItem('rotalog.token', jwt(daqui(-60_000)));
    configurar(true);
    expect(TestBed.inject(AuthService).autenticado()).toBe(false);
  });

  it('retoma a sessão salva ao recarregar', () => {
    sessionStorage.setItem('rotalog.token', jwt(daqui(60_000)));
    configurar(true);
    expect(TestBed.inject(AuthService).autenticado()).toBe(true);
  });

  it('sem loginUrl o login falha com mensagem clara', async () => {
    configurar(true, '');
    await expect(TestBed.inject(AuthService).login('a', 'b').toPromise()).rejects.toMatchObject({
      mensagem: 'Login não configurado.',
    });
  });
});

describe('authInterceptor (ligado)', () => {
  it('manda Bearer só para as nossas APIs, nunca para terceiros', () => {
    sessionStorage.setItem('rotalog.token', jwt(daqui(60_000)));
    configurar(true);
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);
    http.get(`${environment.apiEntregasUrl}/entregas`).subscribe();
    http.get('https://terceiro.example/x').subscribe();
    expect(ctrl.expectOne(`${environment.apiEntregasUrl}/entregas`).request.headers.get('Authorization')).toMatch(/^Bearer /);
    expect(ctrl.expectOne('https://terceiro.example/x').request.headers.has('Authorization')).toBe(false);
  });

  it('401 encerra a sessão e leva ao login com o retorno', async () => {
    sessionStorage.setItem('rotalog.token', jwt(daqui(60_000)));
    configurar(true);
    const router = TestBed.inject(Router);
    const nav = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);
    const erro = jest.fn();
    http.get(`${environment.apiFrotasUrl}/veiculos`).subscribe({ error: erro });
    ctrl.expectOne(`${environment.apiFrotasUrl}/veiculos`).flush({}, { status: 401, statusText: 'x' });
    expect(erro).toHaveBeenCalled();
    expect(TestBed.inject(AuthService).autenticado()).toBe(false);
    expect(nav).toHaveBeenCalledWith(['/login'], { queryParams: { retorno: router.url } });
  });
});

describe('guards (ligado)', () => {
  it('sem sessão manda ao login guardando a rota pedida; com sessão deixa passar', () => {
    configurar(true);
    const router = TestBed.inject(Router);
    const r = TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/veiculos' } as never)) as UrlTree;
    expect(router.serializeUrl(r)).toBe('/login?retorno=%2Fveiculos');
    expect(TestBed.runInInjectionContext(() => loginGuard({} as never, {} as never))).toBe(true);

    sessionStorage.setItem('rotalog.token', jwt(daqui(60_000)));
    TestBed.resetTestingModule();
    configurar(true);
    expect(TestBed.runInInjectionContext(() => authGuard({} as never, { url: '/veiculos' } as never))).toBe(true);
  });
});

describe('retornoSeguro', () => {
  it('aceita só caminhos internos (sem open redirect)', () => {
    expect(retornoSeguro('/veiculos')).toBe('/veiculos');
    for (const ruim of ['https://evil.test', '//evil.test', '/\\evil.test', 'veiculos', '', null, undefined]) {
      expect(retornoSeguro(ruim)).toBe('/dashboard');
    }
  });
});

describe('LoginPage', () => {
  function pagina(retorno: string | null = '/veiculos') {
    configurar(true);
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: { get: () => retorno } } },
    });
    const c = TestBed.createComponent(LoginPage).componentInstance;
    return { c, ctrl: TestBed.inject(HttpTestingController), router: TestBed.inject(Router) };
  }

  it('campos vazios mostram o erro e não chamam a API', async () => {
    const { c, ctrl } = pagina();
    await c.entrar(new Event('submit'));
    expect(c.erroDe('usuario')).toBe('Campo obrigatório.');
    expect(c.erroDe('senha')).toBe('Campo obrigatório.');
    ctrl.expectNone('http://login.test/token');
  });

  it('401 mostra mensagem genérica (sem dizer qual campo errou) e limpa a senha', async () => {
    const { c, ctrl } = pagina();
    c.form.setValue({ usuario: 'ana', senha: 'errada' });
    const p = c.entrar(new Event('submit'));
    ctrl.expectOne('http://login.test/token').flush({}, { status: 401, statusText: 'x' });
    await p;
    expect(c.erro()).toBe('Usuário ou senha inválidos.');
    expect(c.form.controls.senha.value).toBe('');
    expect(c.enviando()).toBe(false);
  });

  it('sucesso navega para o retorno seguro', async () => {
    const { c, ctrl, router } = pagina('/veiculos');
    const nav = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    c.form.setValue({ usuario: 'ana', senha: 'ok' });
    const p = c.entrar(new Event('submit'));
    ctrl.expectOne('http://login.test/token').flush({ token: jwt(daqui(60_000)) });
    await p;
    expect(nav).toHaveBeenCalledWith('/veiculos');
  });

  it('retorno malicioso cai no dashboard', async () => {
    const { c, ctrl, router } = pagina('https://evil.test');
    const nav = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    c.form.setValue({ usuario: 'ana', senha: 'ok' });
    const p = c.entrar(new Event('submit'));
    ctrl.expectOne('http://login.test/token').flush({ token: jwt(daqui(60_000)) });
    await p;
    expect(nav).toHaveBeenCalledWith('/dashboard');
  });
});

describe('nomeDoToken', () => {
  const token = (corpo: object) => jwt().replace(/.[^.]+./, `.${btoa(JSON.stringify(corpo)).replace(/=+$/, '')}.`);

  it('lê as claims mais comuns, na ordem name, nome, preferred_username, username, sub', () => {
    expect(nomeDoToken(token({ name: 'A', nome: 'B', sub: 'C' }))).toBe('A');
    expect(nomeDoToken(token({ nome: 'B', sub: 'C' }))).toBe('B');
    expect(nomeDoToken(token({ preferred_username: 'P', sub: 'C' }))).toBe('P');
    expect(nomeDoToken(token({ username: 'U', sub: 'C' }))).toBe('U');
    expect(nomeDoToken(token({ sub: 'C' }))).toBe('C');
  });

  it('ignora valores vazios, não textuais e tokens inválidos', () => {
    expect(nomeDoToken(token({ name: '   ', sub: 'C' }))).toBe('C');
    expect(nomeDoToken(token({ name: 42 }))).toBeNull();
    expect(nomeDoToken(token({}))).toBeNull();
    expect(nomeDoToken('lixo')).toBeNull();
    expect(nomeDoToken(null)).toBeNull();
  });

  it('limita o tamanho (40 caracteres) e tira espaços das pontas', () => {
    expect(nomeDoToken(token({ name: '  Ana  ' }))).toBe('Ana');
    expect(nomeDoToken(token({ name: 'x'.repeat(100) }))?.length).toBe(40);
  });

  it('o AuthService expõe o usuário só com sessão válida', () => {
    configurar(true);
    const s = TestBed.inject(AuthService);
    expect(s.usuario()).toBeNull();
    sessionStorage.setItem('rotalog.token', token({ name: 'Ana', exp: daqui(60_000) }));
    TestBed.resetTestingModule();
    configurar(true);
    expect(TestBed.inject(AuthService).usuario()).toBe('Ana');
    sessionStorage.setItem('rotalog.token', token({ name: 'Ana', exp: daqui(-60_000) }));
    TestBed.resetTestingModule();
    configurar(true);
    expect(TestBed.inject(AuthService).usuario()).toBeNull();
  });
});
