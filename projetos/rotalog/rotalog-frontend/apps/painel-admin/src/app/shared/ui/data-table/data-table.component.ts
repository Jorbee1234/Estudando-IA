import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Tabela com legenda acessível e rolagem horizontal (e vertical opcional, com `rolavel`). O conteúdo (thead/tbody)
 * é projetado pela página:
 *
 * <app-data-table legenda="Lista de veículos">
 *   <thead>…</thead><tbody>…</tbody>
 * </app-data-table>
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-table.component.html',
})
export class DataTableComponent {
  readonly legenda = input.required<string>();
  /**
   * Limita a altura e rola por dentro, com o cabeçalho fixo. Só vale a pena com muitas linhas
   * (25 ou 50 por página); com poucas, a tabela cresce e a página rola.
   */
  readonly rolavel = input(false);
}
