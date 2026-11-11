import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DadoGrafico, percentual } from './dado-grafico';

/**
 * Rosca em SVG, sem biblioteca (ADR 0003, D4). O desenho e a legenda são decorativos
 * (aria-hidden): quem usa leitor de tela lê a tabela de dados visualmente oculta. A cor nunca é
 * o único sinal: cada fatia tem rótulo, valor e percentual.
 */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './donut-chart.component.html',
})
export class DonutChartComponent {
  readonly titulo = input.required<string>();
  readonly dados = input.required<readonly DadoGrafico[]>();
  /** O que está sendo contado, no plural: "veículos". */
  readonly unidade = input('itens');
  /** Forma no singular, usada quando o total é 1 ("1 veículo" em vez de "1 veículos"). */
  readonly unidadeSingular = input<string | null>(null);

  protected readonly total = computed(() => this.dados().reduce((t, d) => t + Math.max(0, d.valor), 0));
  protected readonly nomeDaUnidade = computed(() => (this.total() === 1 && this.unidadeSingular()) || this.unidade());

  /**
   * Circunferência normalizada em 100 (r = 100 / 2π), então o comprimento do traço é o
   * próprio percentual. O deslocamento acumula as fatias anteriores.
   */
  protected readonly segmentos = computed(() => {
    const total = this.total();
    let acumulado = 0;
    return this.dados()
      .filter((d) => d.valor > 0)
      .map((d) => {
        const parte = (d.valor / total) * 100;
        const seg = {
          ...d,
          percentual: percentual(d.valor, total),
          tracejado: `${parte} ${100 - parte}`,
          deslocamento: -acumulado,
        };
        acumulado += parte;
        return seg;
      });
  });
}
