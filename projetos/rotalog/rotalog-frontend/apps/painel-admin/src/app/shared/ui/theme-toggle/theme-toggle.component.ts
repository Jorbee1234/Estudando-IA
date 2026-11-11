import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../../core/theme/theme.service';

/** Alterna claro/escuro. Botão com estado (aria-pressed) e rótulo textual. */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './theme-toggle.component.html',
})
export class ThemeToggleComponent {
  private readonly tema = inject(ThemeService);

  protected readonly escuro = computed(() => this.tema.tema() === 'escuro');

  protected alternar(): void {
    this.tema.alternar();
  }
}
