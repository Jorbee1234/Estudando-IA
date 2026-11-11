import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';

export type Tema = 'claro' | 'escuro';

const CHAVE = 'rotalog.tema';

/**
 * Tema claro/escuro. Sem escolha salva, segue prefers-color-scheme.
 * A escolha só é guardada em localStorage como conveniência (pode estar bloqueado).
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly doc = inject(DOCUMENT);

  readonly tema = signal<Tema>(this.inicial());

  constructor() {
    effect(() => {
      this.doc.documentElement.setAttribute(
        'data-theme',
        this.tema() === 'escuro' ? 'dark' : 'light'
      );
    });
  }

  alternar(): void {
    this.definir(this.tema() === 'escuro' ? 'claro' : 'escuro');
  }

  definir(tema: Tema): void {
    this.tema.set(tema);
    try {
      localStorage.setItem(CHAVE, tema);
    } catch {
      /* storage indisponível: o tema vale só nesta sessão */
    }
  }

  private inicial(): Tema {
    try {
      const salvo = localStorage.getItem(CHAVE);
      if (salvo === 'claro' || salvo === 'escuro') return salvo;
    } catch {
      /* ignora */
    }
    const escuro =
      this.doc.defaultView?.matchMedia?.('(prefers-color-scheme: dark)')
        .matches ?? false;
    return escuro ? 'escuro' : 'claro';
  }
}
