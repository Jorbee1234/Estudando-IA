import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DensityService } from '../../../core/density/density.service';

/** Alterna entre tabelas confortáveis e compactas. Botão com estado (aria-pressed). */
@Component({
  selector: 'app-density-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './density-toggle.component.html',
})
export class DensityToggleComponent {
  private readonly densidade = inject(DensityService);
  protected readonly compacta = computed(() => this.densidade.densidade() === 'compacta');

  protected alternar(): void {
    this.densidade.alternar();
  }
}
