import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { ConfirmService } from '../../../core/notification/confirm.service';
import { ConfirmDialogComponent } from './confirm-dialog.component';

/** Só para a story: abre o diálogo pelo ConfirmService real e mostra a resposta. */
@Component({
  selector: 'app-demo-confirm',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialogComponent],
  template: `
    <button class="btn btn--danger" (click)="abrir()">Desativar veículo</button>
    <p style="margin-top:1rem">Resposta: {{ resposta() }}</p>
    <app-confirm-dialog />
  `,
})
class DemoConfirmComponent {
  private readonly confirm = inject(ConfirmService);
  protected readonly resposta = signal('—');

  async abrir(): Promise<void> {
    const ok = await this.confirm.confirmar({
      titulo: 'Desativar veículo',
      mensagem: 'Deseja desativar o veículo ABC1D23? Ele deixa de ficar disponível para entregas.',
      confirmar: 'Desativar',
      perigo: true,
    });
    this.resposta.set(ok ? 'confirmado' : 'cancelado');
  }
}

const meta: Meta<ConfirmDialogComponent> = {
  title: 'Shared/ConfirmDialog',
  component: ConfirmDialogComponent,
  decorators: [moduleMetadata({ imports: [DemoConfirmComponent] })],
};
export default meta;

/** <dialog> modal nativo: prende o foco, Esc cancela e o foco volta ao botão. */
export const Interativo: StoryObj<ConfirmDialogComponent> = {
  render: () => ({ template: '<app-demo-confirm />' }),
};
