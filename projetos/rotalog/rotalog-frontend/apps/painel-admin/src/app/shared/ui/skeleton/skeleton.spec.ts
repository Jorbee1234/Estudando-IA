import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';

// ADR 0003, fase 3 (D2): o esqueleto é decorativo; o anúncio é um role="status" à parte.
@Component({
  standalone: true,
  imports: [SkeletonComponent],
  template: `
    <app-skeleton
      [variante]="variante"
      [linhas]="linhas"
      [colunas]="colunas"
      [compacto]="compacto"
      [anunciar]="anunciar"
      [rotulo]="rotulo"
    />
  `,
})
class HostComponent {
  variante: 'linha' | 'cartao' | 'estatisticas' | 'tabela' | 'grafico' = 'linha';
  linhas = 3;
  colunas = 4;
  compacto = false;
  anunciar = true;
  rotulo: string | null = 'Carregando veículos...';
}

describe('SkeletonComponent', () => {
  let f: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const el = () => f.nativeElement as HTMLElement;
  const blocos = () => el().querySelectorAll('.skeleton-bloco').length;

  beforeEach(() => {
    f = TestBed.createComponent(HostComponent);
    host = f.componentInstance;
  });

  function render(parcial: Partial<HostComponent> = {}) {
    Object.assign(host, parcial);
    f.detectChanges();
  }

  it('esconde o desenho de leitores de tela e anuncia o rótulo em role="status"', () => {
    render();
    expect(el().querySelector('.skeleton')?.getAttribute('aria-hidden')).toBe('true');
    const status = el().querySelector('[role="status"]');
    expect(status?.textContent).toContain('Carregando veículos...');
    expect(status?.classList).toContain('visually-hidden');
  });

  it('com [anunciar]=false não cria região de status (a tela declara a sua)', () => {
    render({ anunciar: false });
    expect(el().querySelector('[role="status"]')).toBeNull();
  });

  it('sem rótulo não cria região de status vazia', () => {
    render({ rotulo: null });
    expect(el().querySelector('[role="status"]')).toBeNull();
  });

  it('linha: uma barra por linha, a última mais curta', () => {
    render({ variante: 'linha', linhas: 3 });
    const barras = el().querySelectorAll('.skeleton-barra');
    expect(barras).toHaveLength(3);
    expect(barras[2].classList).toContain('skeleton-barra--curta');
    expect(barras[0].classList).not.toContain('skeleton-barra--curta');
  });

  it('tabela: cabeçalho + N linhas, cada uma com N colunas e a variável --colunas', () => {
    render({ variante: 'tabela', linhas: 5, colunas: 7 });
    const linhas = el().querySelectorAll('.skeleton-tabela__linha');
    expect(linhas).toHaveLength(6);
    expect(linhas[0].classList).toContain('skeleton-tabela__cabecalho');
    expect(linhas[1].querySelectorAll('.skeleton-bloco')).toHaveLength(7);
    expect((linhas[1] as HTMLElement).style.getPropertyValue('--colunas')).toBe('7');
  });

  it('estatísticas: N cartões; o modo compacto troca o ícone e a legenda extra', () => {
    render({ variante: 'estatisticas', colunas: 4, compacto: false });
    expect(el().querySelectorAll('.skeleton-cartao-estat')).toHaveLength(4);
    expect(el().querySelectorAll('.skeleton-icone')).toHaveLength(4);
    render({ compacto: true });
    expect(el().querySelectorAll('.skeleton-icone')).toHaveLength(0);
    expect(el().querySelector('.skeleton-estatisticas--compacto')).not.toBeNull();
  });

  it('cartão e gráfico têm título; o gráfico usa a altura informada', () => {
    render({ variante: 'cartao', linhas: 2 });
    expect(el().querySelector('.skeleton-titulo')).not.toBeNull();
    expect(blocos()).toBe(3);
    render({ variante: 'grafico' });
    expect((el().querySelector('.skeleton-grafico') as HTMLElement).style.height).toBe('14rem');
  });

  it('valores inválidos (negativo, fracionário) não quebram', () => {
    render({ variante: 'tabela', linhas: -2, colunas: 2.7 });
    expect(el().querySelectorAll('.skeleton-tabela__linha')).toHaveLength(1);
    expect(el().querySelector('.skeleton-tabela__cabecalho')?.querySelectorAll('.skeleton-bloco')).toHaveLength(2);
  });
});
