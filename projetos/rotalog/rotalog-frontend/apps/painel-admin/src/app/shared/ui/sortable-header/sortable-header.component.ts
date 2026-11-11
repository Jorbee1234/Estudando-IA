import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type Ordem = 'asc' | 'desc' | null;

/**
 * Cabeçalho ordenável: botão dentro do <th>, com aria-sort.
 * <th appSortable [ordem]="ordem('placa')" (ordenar)="ordenar('placa')">Placa</th>
 */
@Component({
  // Seletor de atributo de propósito: mantém o <th> nativo da tabela.
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'th[appSortable]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sortable-header.component.html',
  host: {
    scope: 'col',
    '[attr.aria-sort]': 'ariaSort()',
  },
})
export class SortableHeaderComponent {
  readonly ordem = input<Ordem>(null);
  readonly ordenar = output<void>();

  protected readonly ariaSort = computed(() => {
    const o = this.ordem();
    return o === 'asc' ? 'ascending' : o === 'desc' ? 'descending' : 'none';
  });

  protected readonly seta = computed(() => {
    const o = this.ordem();
    return o === 'asc' ? '▲' : o === 'desc' ? '▼' : '↕';
  });
}
