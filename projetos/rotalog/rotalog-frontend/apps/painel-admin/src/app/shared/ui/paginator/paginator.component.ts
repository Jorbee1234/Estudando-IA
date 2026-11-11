import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { TAMANHOS_DE_PAGINA } from './paginar';

let proximoId = 0;

/**
 * Paginação no cliente (ADR 0003, D3). O resumo ("11–20 de 87") fica numa região aria-live
 * polite, então quem usa leitor de tela ouve a mudança ao trocar de página. Os controles só
 * aparecem quando há mais itens do que o menor tamanho de página.
 */
@Component({
  selector: 'app-paginator',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  templateUrl: './paginator.component.html',
})
export class PaginatorComponent {
  readonly total = input.required<number>();
  readonly pagina = input(1);
  readonly tamanho = input<number>(TAMANHOS_DE_PAGINA[0]);
  readonly tamanhos = input<readonly number[]>(TAMANHOS_DE_PAGINA);
  /** Nome do que está listado, para o rótulo da navegação: "veículos". */
  readonly itens = input('itens');

  readonly paginaChange = output<number>();
  readonly tamanhoChange = output<number>();

  protected readonly id = `paginador-${++proximoId}`;
  protected readonly totalPaginas = computed(() => Math.max(1, Math.ceil(this.total() / this.tamanho())));
  protected readonly atual = computed(() => Math.min(Math.max(1, this.pagina()), this.totalPaginas()));
  protected readonly de = computed(() => (this.total() === 0 ? 0 : (this.atual() - 1) * this.tamanho() + 1));
  protected readonly ate = computed(() => Math.min(this.total(), this.atual() * this.tamanho()));
  protected readonly comControles = computed(() => this.total() > Math.min(...this.tamanhos()));

  protected ir(pagina: number): void {
    const alvo = Math.min(Math.max(1, pagina), this.totalPaginas());
    if (alvo !== this.atual()) this.paginaChange.emit(alvo);
  }

  protected mudarTamanho(evento: Event): void {
    this.tamanhoChange.emit(Number((evento.target as HTMLSelectElement).value));
  }
}
