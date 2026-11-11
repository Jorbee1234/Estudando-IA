import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, viewChild } from '@angular/core';
import { ConfirmService } from '../../../core/notification/confirm.service';

/**
 * Usa <dialog>.showModal(): o navegador prende o foco no diálogo, torna o resto inerte,
 * fecha com Esc e devolve o foco a quem o abriu (ADR 0001, D6).
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');

  /** Quem tinha o foco antes de abrir: o <dialog> some do DOM sem close(), então o navegador não o devolve. */
  private origem: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const aberto = this.confirm.pedido() !== null;
      const el = this.dialog()?.nativeElement;
      if (!aberto) {
        // Só depois do render que remove o <dialog>: enquanto ele está no DOM, o resto da página é inerte.
        const origem = this.origem;
        this.origem = null;
        if (origem) setTimeout(() => origem.isConnected && origem.focus());
        return;
      }
      if (el && !el.open) {
        const ativo = document.activeElement;
        this.origem = ativo instanceof HTMLElement && ativo !== document.body ? ativo : null;
        // jsdom (testes) não implementa showModal.
        if (typeof el.showModal === 'function') el.showModal();
        else el.setAttribute('open', '');
      }
    });
  }

  responder(resposta: boolean): void {
    this.confirm.pedido()?.resolver(resposta);
  }

  /** Esc dispara "cancel" no <dialog>: trata como "não" e deixa o @if remover o elemento. */
  aoCancelar(evento: Event): void {
    evento.preventDefault();
    this.responder(false);
  }
}
