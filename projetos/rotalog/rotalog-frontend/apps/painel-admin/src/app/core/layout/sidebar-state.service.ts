import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

const CHAVE = 'rotalog.sidebar';

/**
 * Menu lateral recolhido (só ícones) no desktop (ADR 0003, D6). O estado vai para o atributo
 * data-sidebar="recolhida" no <html>, que redefine --largura-sidebar (o conteúdo acompanha),
 * e fica em localStorage só como conveniência (pode estar bloqueado). Em telas estreitas o
 * menu é uma gaveta e este estado é ignorado pelo CSS.
 */
@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  private readonly doc = inject(DOCUMENT);

  readonly recolhida = signal(this.inicial());

  constructor() {
    effect(() => {
      const raiz = this.doc.documentElement;
      if (this.recolhida()) raiz.setAttribute('data-sidebar', 'recolhida');
      else raiz.removeAttribute('data-sidebar');
    });
  }

  alternar(): void {
    this.definir(!this.recolhida());
  }

  definir(recolhida: boolean): void {
    this.recolhida.set(recolhida);
    try {
      localStorage.setItem(CHAVE, recolhida ? 'recolhida' : 'expandida');
    } catch {
      /* storage indisponível: vale só nesta sessão */
    }
  }

  private inicial(): boolean {
    try {
      return localStorage.getItem(CHAVE) === 'recolhida';
    } catch {
      return false;
    }
  }
}
