import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ToastService } from '../../../core/notification/toast.service';
import { ToasterComponent } from './toaster.component';

/** Só para a story: botões que disparam avisos pelo ToastService real. */
@Component({
  selector: 'app-demo-toast',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToasterComponent],
  template: `
    <div style="display:flex; gap:.75rem; flex-wrap:wrap">
      <button class="btn btn--secondary" (click)="toast.info('Funcionalidade não implementada.')">Info</button>
      <button class="btn btn--secondary" (click)="toast.sucesso('Veículo ABC1D23 desativado.')">Sucesso</button>
      <button class="btn btn--danger" (click)="toast.erro('Ocorreu um erro inesperado. Tente novamente.')">Erro</button>
    </div>
    <app-toaster />
  `,
})
class DemoToastComponent {
  protected readonly toast = inject(ToastService);
}

const meta: Meta<ToasterComponent> = {
  title: 'Shared/Toaster',
  component: ToasterComponent,
  decorators: [moduleMetadata({ imports: [DemoToastComponent] })],
};
export default meta;

/** Erros ficam até serem dispensados; info e sucesso somem em 6 s. */
export const Interativo: StoryObj<ToasterComponent> = {
  render: () => ({ template: '<app-demo-toast />' }),
};
