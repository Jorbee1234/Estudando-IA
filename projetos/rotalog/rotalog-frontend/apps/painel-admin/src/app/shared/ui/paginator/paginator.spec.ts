import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { paginar } from './paginar';
import { PaginatorComponent } from './paginator.component';

const lista = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('paginar', () => {
  it('fatia a lista e informa a faixa', () => {
    expect(paginar(lista(57), 2, 10)).toMatchObject({
      itens: lista(57).slice(10, 20),
      total: 57,
      pagina: 2,
      totalPaginas: 6,
      de: 11,
      ate: 20,
    });
  });

  it('última página parcial', () => {
    expect(paginar(lista(57), 6, 10)).toMatchObject({ de: 51, ate: 57 });
    expect(paginar(lista(57), 6, 10).itens).toHaveLength(7);
  });

  it('página fora do intervalo é ajustada (0, negativa, além do fim, NaN)', () => {
    expect(paginar(lista(57), 99, 10).pagina).toBe(6);
    for (const ruim of [0, -3, Number.NaN]) expect(paginar(lista(57), ruim, 10).pagina).toBe(1);
  });

  it('lista vazia: 1 página, faixa 0 a 0', () => {
    expect(paginar([], 1, 10)).toMatchObject({ itens: [], total: 0, pagina: 1, totalPaginas: 1, de: 0, ate: 0 });
  });

  it('não altera a lista de origem', () => {
    const origem = lista(30);
    paginar(origem, 2, 10);
    expect(origem).toEqual(lista(30));
  });
});

@Component({
  standalone: true,
  imports: [PaginatorComponent],
  template: `<app-paginator
    itens="veículos"
    [total]="total"
    [pagina]="pagina"
    [tamanho]="tamanho"
    (paginaChange)="paginas.push($event)"
    (tamanhoChange)="tamanhos.push($event)"
  />`,
})
class HostComponent {
  total = 57;
  pagina = 2;
  tamanho = 10;
  paginas: number[] = [];
  tamanhos: number[] = [];
}

describe('PaginatorComponent', () => {
  function render(parcial: Partial<HostComponent> = {}) {
    const f = TestBed.createComponent(HostComponent);
    Object.assign(f.componentInstance, parcial);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    return {
      f,
      el,
      host: f.componentInstance,
      botoes: () => Array.from(el.querySelectorAll('button')) as HTMLButtonElement[],
    };
  }

  it('anuncia a faixa numa região aria-live polite e nomeia a navegação', () => {
    const { el } = render();
    const resumo = el.querySelector('.paginador__resumo') as HTMLElement;
    expect(resumo.getAttribute('aria-live')).toBe('polite');
    expect(resumo.textContent?.replace(/\s+/g, ' ').trim()).toBe('11–20 de 57');
    expect(el.querySelector('nav')?.getAttribute('aria-label')).toBe('Paginação de veículos');
    expect(el.textContent).toContain('Página 2 de 6');
  });

  it('anterior e próxima emitem a página vizinha', () => {
    const { botoes, host } = render();
    botoes()[0].click();
    botoes()[1].click();
    expect(host.paginas).toEqual([1, 3]);
  });

  it('desabilita "anterior" na primeira e "próxima" na última', () => {
    const a = render({ pagina: 1 });
    expect(a.botoes()[0].disabled).toBe(true);
    expect(a.botoes()[1].disabled).toBe(false);
    const b = render({ pagina: 6 });
    expect(b.botoes()[1].disabled).toBe(true);
  });

  it('trocar o tamanho emite o novo valor', () => {
    const { el, host, f } = render();
    const sel = el.querySelector('select') as HTMLSelectElement;
    expect(sel.value).toBe('10');
    sel.value = '25';
    sel.dispatchEvent(new Event('change'));
    f.detectChanges();
    expect(host.tamanhos).toEqual([25]);
  });

  it('os botões têm nome acessível por extenso', () => {
    const { botoes } = render();
    expect(botoes().map((b) => b.getAttribute('aria-label'))).toEqual(['Página anterior', 'Próxima página']);
  });

  it('com poucos itens mostra só o resumo (sem controles)', () => {
    const { el } = render({ total: 7, pagina: 1 });
    expect(el.querySelector('.paginador__resumo')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('1–7 de 7');
    expect(el.querySelector('button')).toBeNull();
    expect(el.querySelector('select')).toBeNull();
  });

  it('sem itens diz "Nenhum item"', () => {
    const { el } = render({ total: 0, pagina: 1 });
    expect(el.querySelector('.paginador__resumo')?.textContent).toContain('Nenhum item');
  });
});
