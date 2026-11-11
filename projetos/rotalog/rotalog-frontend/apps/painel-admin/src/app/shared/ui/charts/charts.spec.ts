import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BarChartComponent } from './bar-chart.component';
import { DadoGrafico, percentual } from './dado-grafico';
import { DonutChartComponent } from './donut-chart.component';

// ADR 0003, fase 5 (D4): o desenho é decorativo; a tabela oculta é o que o leitor de tela lê.
const dados: DadoGrafico[] = [
  { rotulo: 'Ativo', valor: 6, cor: 'var(--grafico-3)' },
  { rotulo: 'Em manutenção', valor: 3, cor: 'var(--grafico-2)' },
  { rotulo: 'Inativo', valor: 1, cor: 'var(--grafico-sem-dado)' },
];

@Component({
  standalone: true,
  imports: [DonutChartComponent, BarChartComponent],
  template: `
    <app-donut-chart titulo="Frota por situação" unidade="veículos" [dados]="dados" />
    <app-bar-chart titulo="Manutenções por mês" unidade="manutenções" [dados]="dados" />
  `,
})
class HostComponent {
  dados: DadoGrafico[] = dados;
}

function render(d: DadoGrafico[] = dados) {
  const f = TestBed.createComponent(HostComponent);
  f.componentInstance.dados = d;
  f.detectChanges();
  const el = f.nativeElement as HTMLElement;
  return {
    donut: el.querySelector('app-donut-chart') as HTMLElement,
    barras: el.querySelector('app-bar-chart') as HTMLElement,
  };
}

const linhasDaTabela = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('tbody tr')).map((tr) =>
    Array.from(tr.children).map((c) => c.textContent?.trim())
  );

describe('percentual', () => {
  it('arredonda e protege contra total zero', () => {
    expect(percentual(1, 3)).toBe(33);
    expect(percentual(2, 3)).toBe(67);
    expect(percentual(5, 0)).toBe(0);
  });
});

describe('DonutChartComponent', () => {
  it('desenha uma fatia por categoria com valor, em arco proporcional', () => {
    const { donut } = render();
    const fatias = Array.from(donut.querySelectorAll('.donut__segmento'));
    expect(fatias).toHaveLength(3);
    expect(fatias.map((c) => c.getAttribute('stroke-dasharray'))).toEqual(['60 40', '30 70', '10 90']);
    // Cada fatia começa onde a anterior terminou.
    expect(fatias.map((c) => c.getAttribute('stroke-dashoffset'))).toEqual(['0', '-60', '-90']);
  });

  it('usa a cor do dado (token), não uma cor fixa', () => {
    const { donut } = render();
    const fatia = donut.querySelector('.donut__segmento') as SVGElement;
    expect(fatia.style.stroke).toBe('var(--grafico-3)');
  });

  it('mostra o total e a unidade no centro e na legenda de texto', () => {
    const { donut } = render();
    expect(donut.querySelector('.donut__total')?.textContent).toBe('10');
    expect(donut.querySelector('.donut__unidade')?.textContent).toBe('veículos');
    expect(donut.querySelector('figcaption')?.textContent?.trim()).toBe('Total: 10 veículos');
    expect(donut.querySelector('.legenda')?.textContent).toContain('Em manutenção');
    expect(donut.querySelector('.legenda')?.textContent).toContain('3 (30%)');
  });

  it('esconde o desenho e a legenda dos leitores de tela', () => {
    const { donut } = render();
    expect(donut.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(donut.querySelector('.legenda')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('a tabela oculta tem legenda, cabeçalhos com escopo e todos os dados', () => {
    const { donut } = render();
    const tabela = donut.querySelector('div.visually-hidden table') as HTMLTableElement;
    expect(tabela.querySelector('caption')?.textContent).toBe('Frota por situação');
    expect(Array.from(tabela.querySelectorAll('thead th')).every((th) => th.getAttribute('scope') === 'col')).toBe(true);
    expect(linhasDaTabela(donut)).toEqual([
      ['Ativo', '6', '60%'],
      ['Em manutenção', '3', '30%'],
      ['Inativo', '1', '10%'],
    ]);
  });

  it('ignora categorias com valor zero e uma única categoria ocupa o anel todo', () => {
    const { donut } = render([
      { rotulo: 'A', valor: 4, cor: 'var(--grafico-1)' },
      { rotulo: 'B', valor: 0, cor: 'var(--grafico-2)' },
    ]);
    const fatias = donut.querySelectorAll('.donut__segmento');
    expect(fatias).toHaveLength(1);
    expect(fatias[0].getAttribute('stroke-dasharray')).toBe('100 0');
    expect(linhasDaTabela(donut)).toEqual([['A', '4', '100%']]);
  });

  it('sem dados: anel vazio, "Sem dados." e tabela sem linhas', () => {
    const { donut } = render([]);
    expect(donut.querySelectorAll('.donut__segmento')).toHaveLength(0);
    expect(donut.querySelector('.donut__total')?.textContent).toBe('0');
    expect(donut.querySelector('figcaption')?.textContent?.trim()).toBe('Sem dados.');
    expect(linhasDaTabela(donut)).toEqual([]);
  });
});

describe('concordância da unidade', () => {
  @Component({
    standalone: true,
    imports: [DonutChartComponent, BarChartComponent],
    template: `
      <app-donut-chart titulo="T" unidade="veículos" unidadeSingular="veículo" [dados]="dados" />
      <app-bar-chart titulo="T" unidade="entregas" unidadeSingular="entrega" [dados]="dados" />
    `,
  })
  class SingularHostComponent {
    dados: DadoGrafico[] = [{ rotulo: 'A', valor: 1, cor: 'var(--grafico-1)' }];
  }

  it('com total 1 usa o singular ("Total: 1 veículo", "1 entrega")', () => {
    const f = TestBed.createComponent(SingularHostComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('app-donut-chart figcaption')?.textContent?.trim()).toBe('Total: 1 veículo');
    expect(el.querySelector('.donut__unidade')?.textContent).toBe('veículo');
    expect(el.querySelector('app-bar-chart figcaption')?.textContent?.trim()).toBe('Total: 1 entrega');
  });

  it('com total diferente de 1 mantém o plural', () => {
    const f = TestBed.createComponent(SingularHostComponent);
    f.componentInstance.dados = [{ rotulo: 'A', valor: 2, cor: 'var(--grafico-1)' }];
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('app-donut-chart figcaption')?.textContent?.trim()).toBe('Total: 2 veículos');
  });
});

describe('BarChartComponent', () => {
  it('a maior barra ocupa 100% e as demais são proporcionais a ela', () => {
    const { barras } = render();
    const larguras = Array.from(barras.querySelectorAll('.barra__preenchimento')).map((b) => (b as HTMLElement).style.width);
    expect(larguras.map(parseFloat)).toEqual([100, 50, expect.closeTo(16.667, 2)]);
  });

  it('valor pequeno mas positivo nunca some (mínimo de 2%) e zero fica sem barra', () => {
    const { barras } = render([
      { rotulo: 'Grande', valor: 1000, cor: 'var(--grafico-1)' },
      { rotulo: 'Mínimo', valor: 1, cor: 'var(--grafico-1)' },
      { rotulo: 'Zero', valor: 0, cor: 'var(--grafico-1)' },
    ]);
    const larguras = Array.from(barras.querySelectorAll('.barra__preenchimento')).map((b) => (b as HTMLElement).style.width);
    expect(larguras).toEqual(['100%', '2%', '0%']);
  });

  it('mostra rótulo e valor de cada barra, com a cor do dado', () => {
    const { barras } = render();
    const primeira = barras.querySelector('.barra') as HTMLElement;
    expect(primeira.querySelector('.barra__rotulo')?.textContent).toBe('Ativo');
    expect(primeira.querySelector('.barra__valor')?.textContent).toBe('6');
    expect((primeira.querySelector('.barra__preenchimento') as HTMLElement).style.getPropertyValue('--cor')).toBe('var(--grafico-3)');
  });

  it('esconde o desenho e entrega os dados numa tabela oculta com a legenda', () => {
    const { barras } = render();
    expect(barras.querySelector('.barras')?.getAttribute('aria-hidden')).toBe('true');
    expect(barras.querySelector('caption')?.textContent).toBe('Manutenções por mês');
    expect(linhasDaTabela(barras)).toEqual([
      ['Ativo', '6', '60%'],
      ['Em manutenção', '3', '30%'],
      ['Inativo', '1', '10%'],
    ]);
    expect(barras.querySelector('figcaption')?.textContent?.trim()).toBe('Total: 10 manutenções');
  });

  it('sem dados ou só com zeros: "Sem dados." e nenhuma barra com largura', () => {
    const { barras } = render([{ rotulo: 'A', valor: 0, cor: 'var(--grafico-1)' }]);
    expect(barras.querySelector('figcaption')?.textContent?.trim()).toBe('Sem dados.');
    expect((barras.querySelector('.barra__preenchimento') as HTMLElement).style.width).toBe('0%');
  });
});
