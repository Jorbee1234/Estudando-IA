import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Dominio, infoDoStatus } from '../../constants/status-config';

/** Badge de status: ícone + rótulo pt-BR + tom (nunca só cor). Fonte: STATUS_CONFIG. */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-badge.component.html',
})
export class StatusBadgeComponent {
  readonly dominio = input.required<Dominio>();
  readonly valor = input<string | null | undefined>(null);

  protected readonly info = computed(() =>
    infoDoStatus(this.dominio(), this.valor())
  );
}
