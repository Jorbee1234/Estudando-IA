import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/notification/toast.service';

/** Região única de avisos. role="status" anuncia sem roubar o foco; erros usam role="alert". */
@Component({
  selector: 'app-toaster',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toaster.component.html',
})
export class ToasterComponent {
  protected readonly toast = inject(ToastService);
}
