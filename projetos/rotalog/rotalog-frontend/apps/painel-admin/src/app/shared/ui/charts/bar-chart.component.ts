import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DadoGrafico, percentual } from './dado-grafico';

/**
 * Barras horizontais em HTML/CSS, sem biblioteca (ADR 0003, D4). Em vez de SVG escalado, o texto
 * (rótulo e valor) mantém o tamanho em qualquer largura, inclusive no celular. O desenho é
 * decorativo (aria-hidden); a tabela de dados visualmente oculta é o que o leitor de tela lê.
 */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bar-chart.component.html',
})
export class BarChartComponent {
  readonly titulo = input.required<string>();
  readonly dados = input.required<readonly DadoGrafico[]>();
  /** O que está sendo contado, no plural: "manutenções". */
  readonly unidade = input('itens');
  /** Forma no singular, usada quando o total é 1 ("1 veículo" em vez de "1 veículos"). */
  readonly unidadeSingular = input<string | null>(null);

  protected readonly total = computed(() => this.dados().reduce((t, d) => t + Math.max(0, d.valor), 0));
  protected readonly nomeDaUnidade = computed(() => (this.total() === 1 && this.unidadeSingular()) || this.unidade());

  protected readonly barras = computed(() => {
    const maior = Math.max(0, ...this.dados().map((d) => d.valor));
    const total = this.total();
    return this.dados().map((d) => ({
      ...d,
      // Barra com valor > 0 nunca some: no mínimo 2% de largura.
      largura: d.valor > 0 && maior > 0 ? Math.max(2, (d.valor / maior) * 100) : 0,
      percentual: percentual(d.valor, total),
    }));
  });
}
