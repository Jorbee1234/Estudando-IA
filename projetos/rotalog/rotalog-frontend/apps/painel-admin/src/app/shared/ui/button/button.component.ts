import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type VarianteBotao = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';

/**
 * Atributo sobre o <button> nativo (mantém semântica, foco e teclado):
 * <button appButton variante="primary">Salvar</button>
 */
@Component({
  // Seletor de atributo de propósito: mantém o <button> nativo (semântica e teclado).
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[appButton]',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-content />',
  host: {
    '[class]': 'classes()',
    '[attr.type]': 'tipo()',
  },
})
export class ButtonComponent {
  readonly variante = input<VarianteBotao>('primary');
  readonly pequeno = input(false);
  readonly tipo = input<'button' | 'submit'>('button');

  protected readonly classes = computed(
    () => `btn btn--${this.variante()}${this.pequeno() ? ' btn--sm' : ''}`
  );
}
