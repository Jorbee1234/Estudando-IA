import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Estado vazio (sem erro): anunciado a leitores de tela. */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empty-state.component.html',
})
export class EmptyStateComponent {
  readonly mensagem = input.required<string>();
}
