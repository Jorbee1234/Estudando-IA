import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type VarianteSkeleton = 'linha' | 'cartao' | 'estatisticas' | 'tabela' | 'grafico';

/**
 * Esqueleto de carregamento (ADR 0003, D2): imita a forma do conteúdo que vai chegar
 * (linhas, cartões, tabela, gráfico) no lugar de um texto solto.
 *
 * O desenho é decorativo (aria-hidden). Quem usa o componente sozinho informa `rotulo`
 * ("Carregando veículos..."), que vira uma região role="status" visualmente oculta. Quando
 * várias peças se juntam numa tela (dashboard), cada uma usa `[anunciar]="false"` e a tela
 * declara um único role="status".
 */
@Component({
  selector: 'app-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skeleton.component.html',
})
export class SkeletonComponent {
  readonly variante = input<VarianteSkeleton>('linha');
  /** Texto anunciado a leitores de tela, ex.: "Carregando veículos...". */
  readonly rotulo = input<string | null>(null);
  readonly anunciar = input(true);
  /** linha/cartão: nº de barras; tabela: nº de linhas de dados. */
  readonly linhas = input(3);
  /** tabela: nº de colunas; estatísticas: nº de cartões. */
  readonly colunas = input(4);
  /** estatísticas: cartões menores (mini-estatísticas). */
  readonly compacto = input(false);
  /** gráfico: altura da área do desenho. */
  readonly altura = input('14rem');

  protected readonly seqLinhas = computed(() => sequencia(this.linhas()));
  protected readonly seqColunas = computed(() => sequencia(this.colunas()));
}

function sequencia(n: number): number[] {
  return Array.from({ length: Math.max(0, Math.floor(n)) }, (_, i) => i);
}
