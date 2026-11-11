import { Injectable, signal } from '@angular/core';

export interface OpcoesConfirmacao {
  titulo: string;
  mensagem: string;
  confirmar?: string;
  cancelar?: string;
  /** Ação destrutiva: o botão de confirmar usa a variante de perigo. */
  perigo?: boolean;
}

export interface PedidoConfirmacao extends Required<OpcoesConfirmacao> {
  resolver: (resposta: boolean) => void;
}

/** Diálogo de confirmação acessível, no lugar de confirm() (ADR 0001, D5a/D6). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly _pedido = signal<PedidoConfirmacao | null>(null);
  readonly pedido = this._pedido.asReadonly();

  confirmar(opcoes: OpcoesConfirmacao): Promise<boolean> {
    // Um pedido novo cancela o anterior em vez de deixá-lo pendurado.
    this._pedido()?.resolver(false);
    return new Promise<boolean>((resolve) => {
      this._pedido.set({
        confirmar: 'Confirmar',
        cancelar: 'Cancelar',
        perigo: false,
        ...opcoes,
        resolver: (resposta) => {
          this._pedido.set(null);
          resolve(resposta);
        },
      });
    });
  }
}
