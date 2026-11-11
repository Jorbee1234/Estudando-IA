import { Injectable, signal } from '@angular/core';

export type TipoToast = 'info' | 'sucesso' | 'erro';

export interface Toast {
  id: number;
  tipo: TipoToast;
  mensagem: string;
}

/** Avisos curtos e não bloqueantes, no lugar de alert() (ADR 0001, D5a). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  /** Erros ficam até serem dispensados; os demais somem sozinhos. */
  static readonly DURACAO_MS = 6000;

  private proximoId = 0;
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  info(mensagem: string): void {
    this.mostrar('info', mensagem);
  }

  sucesso(mensagem: string): void {
    this.mostrar('sucesso', mensagem);
  }

  erro(mensagem: string): void {
    this.mostrar('erro', mensagem);
  }

  dispensar(id: number): void {
    this._toasts.update((lista) => lista.filter((t) => t.id !== id));
  }

  private mostrar(tipo: TipoToast, mensagem: string): void {
    const id = ++this.proximoId;
    this._toasts.update((lista) => [...lista, { id, tipo, mensagem }]);
    if (tipo !== 'erro') {
      setTimeout(() => this.dispensar(id), ToastService.DURACAO_MS);
    }
  }
}
