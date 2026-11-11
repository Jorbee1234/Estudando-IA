import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type Densidade = 'confortavel' | 'compacta';

const CHAVE = 'rotalog.densidade';

/**
 * Densidade das tabelas e botões (ADR 0003, D1/D3): atributo data-densidade="compacta" no
 * <html>, que os tokens de _tokens.css leem. Confortável é o padrão e não grava atributo.
 * A escolha é só uma conveniência em localStorage (pode estar bloqueado).
 */
@Injectable({ providedIn: 'root' })
export class DensityService {
  private readonly doc = inject(DOCUMENT);

  readonly densidade = signal<Densidade>(this.inicial());

  constructor() {
    effect(() => {
      const raiz = this.doc.documentElement;
      if (this.densidade() === 'compacta') raiz.setAttribute('data-densidade', 'compacta');
      else raiz.removeAttribute('data-densidade');
    });
  }

  alternar(): void {
    this.definir(this.densidade() === 'compacta' ? 'confortavel' : 'compacta');
  }

  definir(densidade: Densidade): void {
    this.densidade.set(densidade);
    try {
      localStorage.setItem(CHAVE, densidade);
    } catch {
      /* storage indisponível: vale só nesta sessão */
    }
  }

  private inicial(): Densidade {
    try {
      return localStorage.getItem(CHAVE) === 'compacta' ? 'compacta' : 'confortavel';
    } catch {
      return 'confortavel';
    }
  }
}
