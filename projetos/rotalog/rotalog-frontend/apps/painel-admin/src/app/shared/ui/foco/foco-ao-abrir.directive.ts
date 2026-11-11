import { Directive, ElementRef, HostListener, inject, OnDestroy, OnInit, output } from '@angular/core';

/**
 * Para painéis e formulários que aparecem na tela (ADR 0001, D6): leva o foco ao elemento
 * ao abrir, devolve o foco a quem o tinha ao fechar e emite `fechar` quando Esc é pressionado.
 * O elemento (normalmente o título) precisa de tabindex="-1".
 */
@Directive({
  selector: '[appFocoAoAbrir]',
  standalone: true,
})
export class FocoAoAbrirDirective implements OnInit, OnDestroy {
  readonly fechar = output<void>();

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private anterior: HTMLElement | null = null;

  ngOnInit(): void {
    const ativo = document.activeElement;
    this.anterior = ativo instanceof HTMLElement && ativo !== document.body ? ativo : null;
    // Espera o primeiro render para o elemento já estar visível.
    queueMicrotask(() => this.el.nativeElement.focus());
  }

  @HostListener('document:keydown.escape')
  aoPressionarEsc(): void {
    this.fechar.emit();
  }

  ngOnDestroy(): void {
    // Se o elemento de origem saiu do DOM (ex.: a linha foi recarregada), o foco cai no <main>.
    const alvo = this.anterior?.isConnected ? this.anterior : document.getElementById('conteudo');
    alvo?.focus();
  }
}
