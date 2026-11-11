import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { estadoNaUrl, inteiro, inteiroEm, inteiroOuNulo, texto } from './estado-na-url';

// ADR 0003, D3: o estado das listas mora na URL e o signal acompanha o "voltar".
@Component({ standalone: true, template: '' })
class TelaComponent {
  readonly url = estadoNaUrl({
    q: texto(),
    pagina: inteiro(1),
    tam: inteiroEm([10, 25, 50], 10),
    id: inteiroOuNulo(),
  });
}

describe('campos', () => {
  it('texto: vazio ou igual ao padrão some da URL', () => {
    expect(texto().escrever('')).toBeNull();
    expect(texto('x').escrever('x')).toBeNull();
    expect(texto().escrever('abc')).toBe('abc');
    expect(texto().ler(null)).toBe('');
    expect(texto('padrao').ler(null)).toBe('padrao');
  });

  it('inteiro: texto inválido, fracionário e abaixo do mínimo caem no padrão', () => {
    const c = inteiro(1);
    for (const ruim of ['abc', '1.5', '0', '-2', null]) expect(c.ler(ruim)).toBe(1);
    expect(c.ler('7')).toBe(7);
    expect(c.escrever(1)).toBeNull();
    expect(c.escrever(7)).toBe('7');
  });

  it('inteiroEm: só aceita valores permitidos', () => {
    const c = inteiroEm([10, 25, 50], 10);
    expect(c.ler('25')).toBe(25);
    expect(c.ler('7')).toBe(10);
    expect(c.ler('abc')).toBe(10);
    expect(c.escrever(10)).toBeNull();
    expect(c.escrever(50)).toBe('50');
  });

  it('inteiroOuNulo: id positivo ou nulo', () => {
    const c = inteiroOuNulo();
    expect(c.ler('3')).toBe(3);
    for (const ruim of ['0', '-1', 'x', null]) expect(c.ler(ruim)).toBeNull();
    expect(c.escrever(null)).toBeNull();
    expect(c.escrever(4)).toBe('4');
  });
});

describe('estadoNaUrl', () => {
  async function abrir(url = '/') {
    TestBed.configureTestingModule({
      imports: [TelaComponent],
      providers: [provideRouter([{ path: '**', children: [] }])],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    const tela = TestBed.createComponent(TelaComponent).componentInstance;
    return { tela, router };
  }

  it('começa pelos valores da URL, com padrão onde falta', async () => {
    const { tela } = await abrir('/lista?q=abc&pagina=3');
    expect(tela.url.valores()).toEqual({ q: 'abc', pagina: 3, tam: 10, id: null });
  });

  it('definir atualiza o signal na hora e a URL logo depois, só com o que difere do padrão', async () => {
    const { tela, router } = await abrir('/lista');
    const ok = tela.url.definir({ q: 'volvo', pagina: 2 });
    expect(tela.url.valores().q).toBe('volvo');
    await ok;
    expect(router.url).toBe('/lista?q=volvo&pagina=2');
    await tela.url.definir({ pagina: 1 });
    expect(router.url).toBe('/lista?q=volvo');
  });

  it('preserva parâmetros de outros donos da URL (merge)', async () => {
    const { tela, router } = await abrir('/lista?outro=1');
    await tela.url.definir({ q: 'x' });
    expect(router.url).toContain('outro=1');
    expect(router.url).toContain('q=x');
  });

  it('substituir troca a entrada do histórico; o padrão empilha uma nova', async () => {
    const { tela, router } = await abrir('/lista');
    const nav = jest.spyOn(router, 'navigate');
    await tela.url.definir({ q: 'a' }, { substituir: true });
    await tela.url.definir({ pagina: 2 });
    expect(nav.mock.calls[0][1]).toMatchObject({ replaceUrl: true });
    expect(nav.mock.calls[1][1]).toMatchObject({ replaceUrl: false });
  });

  it('o signal segue a URL quando ela muda por fora (botão voltar)', async () => {
    const { tela, router } = await abrir('/lista');
    await tela.url.definir({ pagina: 2 });
    await tela.url.definir({ pagina: 3 });
    expect(tela.url.valores().pagina).toBe(3);
    await router.navigateByUrl('/lista?pagina=2');
    expect(tela.url.valores().pagina).toBe(2);
    await router.navigateByUrl('/lista');
    expect(tela.url.valores().pagina).toBe(1);
  });

  it('URL com valor inválido não quebra: usa o padrão', async () => {
    const { tela } = await abrir('/lista?pagina=zzz&tam=7&id=-1');
    expect(tela.url.valores()).toMatchObject({ pagina: 1, tam: 10, id: null });
  });
});
