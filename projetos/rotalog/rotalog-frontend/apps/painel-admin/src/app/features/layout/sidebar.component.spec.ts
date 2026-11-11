import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { SidebarComponent } from './sidebar.component';

// ADR 0003, fase 6 (D6): menu recolhido com dicas acessíveis e área do usuário (auth desligada por padrão).
const auth = environment.autenticacao;
const original = { ...auth };

function jwt(corpo: object): string {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '');
  return `${b64({ alg: 'none' })}.${b64(corpo)}.assinatura`;
}

function montar() {
  TestBed.configureTestingModule({
    imports: [SidebarComponent],
    providers: [provideRouter([{ path: '**', children: [] }]), provideHttpClient()],
  });
  const f = TestBed.createComponent(SidebarComponent);
  f.detectChanges();
  const el = f.nativeElement as HTMLElement;
  return { f, el, raiz: el.querySelector('.sidebar') as HTMLElement };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.documentElement.removeAttribute('data-sidebar');
});

afterEach(() => {
  Object.assign(auth, original);
  sessionStorage.clear();
});

describe('SidebarComponent: itens e recolhimento', () => {
  it('mostra os 6 itens com ícone decorativo, rótulo e data-rotulo para a dica', () => {
    const { el } = montar();
    const links = Array.from(el.querySelectorAll('nav a'));
    expect(links.map((a) => a.getAttribute('data-rotulo'))).toEqual(['Dashboard', 'Veículos', 'Motoristas', 'Manutenções', 'Alertas de manutenção', 'Entregas']);
    for (const a of links) {
      expect(a.querySelector('.icon')?.getAttribute('aria-hidden')).toBe('true');
      expect(a.querySelector('.rotulo')?.textContent).toBe(a.getAttribute('data-rotulo'));
    }
  });

  it('o botão de recolher expõe aria-expanded e troca o rótulo', () => {
    const { f, el, raiz } = montar();
    const botao = el.querySelector('.recolher-toggle') as HTMLButtonElement;
    expect(botao.getAttribute('aria-expanded')).toBe('true');
    expect(botao.getAttribute('aria-controls')).toBe('barra-lateral');
    expect(raiz.id).toBe('barra-lateral');
    expect(botao.textContent).toContain('Recolher menu');

    botao.click();
    f.detectChanges();
    expect(botao.getAttribute('aria-expanded')).toBe('false');
    expect(botao.textContent).toContain('Expandir menu');
    expect(raiz.classList).toContain('recolhida');
    TestBed.flushEffects();
    expect(document.documentElement.getAttribute('data-sidebar')).toBe('recolhida');
  });

  it('recolhido, o texto dos rótulos continua no DOM (é o nome acessível dos links)', () => {
    const { f, el } = montar();
    (el.querySelector('.recolher-toggle') as HTMLButtonElement).click();
    f.detectChanges();
    // O ícone é aria-hidden; o rótulo é o que dá nome ao link e permanece no DOM.
    expect(Array.from(el.querySelectorAll('nav a .rotulo')).map((r) => r.textContent)).toEqual([
      'Dashboard',
      'Veículos',
      'Motoristas',
      'Manutenções',
      'Alertas de manutenção',
      'Entregas',
    ]);
  });

  it('o logo curto é decorativo e o nome completo continua disponível', () => {
    const { el } = montar();
    expect(el.querySelector('.logo-curto')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('.logo-completo')?.textContent).toBe('RotaLog');
  });
});

describe('SidebarComponent: dicas dispensáveis (WCAG 1.4.13)', () => {
  it('Esc dispensa as dicas com o menu recolhido; entrar em outro item as devolve', () => {
    const { f, el, raiz } = montar();
    (el.querySelector('.recolher-toggle') as HTMLButtonElement).click();
    f.detectChanges();
    expect(raiz.classList).not.toContain('sem-dicas');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    f.detectChanges();
    expect(raiz.classList).toContain('sem-dicas');

    el.querySelector('nav a')?.dispatchEvent(new Event('pointerenter'));
    f.detectChanges();
    expect(raiz.classList).not.toContain('sem-dicas');
  });

  it('Esc com o menu expandido não faz nada (não há dicas)', () => {
    const { f, raiz } = montar();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    f.detectChanges();
    expect(raiz.classList).not.toContain('sem-dicas');
  });

  it('alternar o recolhimento zera a dispensa anterior', () => {
    const { f, el, raiz } = montar();
    const botao = el.querySelector('.recolher-toggle') as HTMLButtonElement;
    botao.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    f.detectChanges();
    expect(raiz.classList).toContain('sem-dicas');
    botao.click();
    botao.click();
    f.detectChanges();
    expect(raiz.classList).not.toContain('sem-dicas');
  });
});

describe('SidebarComponent: área do usuário', () => {
  it('com a autenticação desligada (padrão) não aparece nem "Sair"', () => {
    const { el } = montar();
    expect(el.querySelector('.usuario')).toBeNull();
    expect(Array.from(el.querySelectorAll('button')).some((b) => b.textContent?.includes('Sair'))).toBe(false);
  });

  it('ligada e sem sessão, também não aparece', () => {
    auth.ativa = true;
    const { el } = montar();
    expect(el.querySelector('.usuario')).toBeNull();
  });

  it('ligada e com sessão: mostra a inicial e o nome do token, e o botão Sair', () => {
    auth.ativa = true;
    sessionStorage.setItem('rotalog.token', jwt({ name: 'Maria Souza', exp: Math.floor(Date.now() / 1000) + 600 }));
    const { el } = montar();
    expect(el.querySelector('.avatar')?.textContent?.trim()).toBe('M');
    expect(el.querySelector('.avatar')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('.usuario-nome')?.textContent?.trim()).toBe('Maria Souza');
    expect(Array.from(el.querySelectorAll('button')).some((b) => b.textContent?.includes('Sair'))).toBe(true);
  });

  it('sem claim de nome no token, usa "Usuário" e a inicial U', () => {
    auth.ativa = true;
    sessionStorage.setItem('rotalog.token', jwt({ exp: Math.floor(Date.now() / 1000) + 600 }));
    const { el } = montar();
    expect(el.querySelector('.usuario-nome')?.textContent?.trim()).toBe('Usuário');
    expect(el.querySelector('.avatar')?.textContent?.trim()).toBe('U');
  });

  it('Sair encerra a sessão e leva ao login', () => {
    auth.ativa = true;
    sessionStorage.setItem('rotalog.token', jwt({ name: 'Ana', exp: Math.floor(Date.now() / 1000) + 600 }));
    const { f, el } = montar();
    const navegar = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const sair = Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Sair')) as HTMLButtonElement;
    sair.click();
    f.detectChanges();
    expect(TestBed.inject(AuthService).autenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/login']);
    expect(el.querySelector('.usuario')).toBeNull();
  });

  it('o nome vem do token como TEXTO: HTML nele não vira marcação', () => {
    auth.ativa = true;
    sessionStorage.setItem('rotalog.token', jwt({ name: '<img src=x onerror=alert(1)>', exp: Math.floor(Date.now() / 1000) + 600 }));
    const { el } = montar();
    expect(el.querySelector('.usuario img')).toBeNull();
    expect(el.querySelector('.usuario-nome')?.textContent).toContain('<img');
  });
});
