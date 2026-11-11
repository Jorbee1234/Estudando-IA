import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, firstValueFrom, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EntregasApiService } from '../../core/api/entregas-api.service';
import { ApiError } from '../../core/api/api-error';
import { Entrega } from '../../core/models';
import { FormsModule } from '@angular/forms';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { DataTableComponent } from '../../shared/ui/data-table/data-table.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PaginatorComponent } from '../../shared/ui/paginator/paginator.component';
import { DensityToggleComponent } from '../../shared/ui/density-toggle/density-toggle.component';
import { paginar, TAMANHO_PADRAO, TAMANHOS_DE_PAGINA } from '../../shared/ui/paginator/paginar';
import { estadoNaUrl, inteiro, inteiroEm, inteiroOuNulo, texto } from '../../core/url-state/estado-na-url';
import { FocoAoAbrirDirective } from '../../shared/ui/foco/foco-ao-abrir.directive';
import { ButtonComponent } from '../../shared/ui/button/button.component';

@Component({
  selector: 'app-entregas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent, FormsModule, FocoAoAbrirDirective, PageHeaderComponent, DataTableComponent, StatusBadgeComponent, EmptyStateComponent, ButtonComponent, PaginatorComponent, DensityToggleComponent],
  templateUrl: './entregas.page.html',
  styleUrl: './entregas.page.css',
})
export class EntregasPage implements OnInit {
  readonly entregas = signal<Entrega[]>([]);
  readonly loading = signal(true);
  readonly erro = signal<string | null>(null);
  /** Busca, status, página e entrega aberta moram na URL (link copiável, "voltar" funciona). */
  readonly url = estadoNaUrl({
    q: texto(),
    status: texto(),
    pagina: inteiro(1),
    tam: inteiroEm(TAMANHOS_DE_PAGINA, TAMANHO_PADRAO),
    id: inteiroOuNulo(),
  });
  readonly filtros = this.url.valores;
  readonly temFiltro = computed(() => !!this.filtros().q || !!this.filtros().status);

  /** A busca só vai para a URL ~250 ms depois da última tecla. */
  private readonly digitado$ = new Subject<string>();

  readonly entregasFiltradas = computed(() => {
    const termo = this.filtros().q.toLowerCase();
    const status = this.filtros().status;
    return this.entregas().filter(e => {
      const matchBusca = !termo ||
        e.codigo_rastreio?.toLowerCase().includes(termo) ||
        e.destino_endereco?.toLowerCase().includes(termo);
      return matchBusca && (!status || e.status === status);
    });
  });

  readonly pagina = computed(() => paginar(this.entregasFiltradas(), this.filtros().pagina, this.filtros().tam));

  readonly entregaSelecionada = computed(() => {
    const id = this.filtros().id;
    return id === null ? null : (this.entregas().find((e) => e.id === id) ?? null);
  });

  /** Atalho para o portal de rastreamento (app React), onde fica o mapa. */
  readonly rastreamentoUrl = environment.rastreamentoUrl;

  private readonly entregasApi = inject(EntregasApiService);

  constructor() {
    this.digitado$
      .pipe(debounceTime(250), takeUntilDestroyed())
      .subscribe((q) => this.url.definir({ q, pagina: 1 }, { substituir: true }));
  }

  ngOnInit(): void {
    this.carregarEntregas();
  }

  digitar(q: string): void {
    this.digitado$.next(q);
  }

  filtrarStatus(status: string): void {
    this.url.definir({ status, pagina: 1 });
  }

  limparFiltros(): void {
    this.url.definir({ q: '', status: '', pagina: 1 });
  }

  irParaPagina(pagina: number): void {
    this.url.definir({ pagina });
  }

  mudarTamanho(tam: number): void {
    this.url.definir({ tam, pagina: 1 });
  }

  fecharDetalhe(): void {
    this.url.definir({ id: null });
  }

  async carregarEntregas(): Promise<void> {
    this.loading.set(true);
    this.erro.set(null);
    try {
      this.entregas.set(await firstValueFrom(this.entregasApi.listar()));
    } catch (e) {
      this.entregas.set([]);
      this.erro.set(ApiError.de(e).mensagem);
    }
    this.loading.set(false);
  }

  countByStatus(status: string): number {
    return this.entregas().filter(e => e.status === status).length;
  }

  selecionarEntrega(entrega: Entrega): void {
    this.url.definir({ id: entrega.id });
  }
}
