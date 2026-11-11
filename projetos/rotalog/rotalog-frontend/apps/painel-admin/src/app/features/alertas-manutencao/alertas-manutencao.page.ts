import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { debounceTime, firstValueFrom, Subject } from 'rxjs';
import { AlertasManutencaoApiService } from '../../core/api/alertas-manutencao-api.service';
import { ApiError } from '../../core/api/api-error';
import { AlertaManutencao } from '../../core/models';
import { estadoNaUrl, inteiro, inteiroEm, texto } from '../../core/url-state/estado-na-url';
import { ToastService } from '../../core/notification/toast.service';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { DataTableComponent } from '../../shared/ui/data-table/data-table.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { PaginatorComponent } from '../../shared/ui/paginator/paginator.component';
import { DensityToggleComponent } from '../../shared/ui/density-toggle/density-toggle.component';
import { paginar, TAMANHO_PADRAO, TAMANHOS_DE_PAGINA } from '../../shared/ui/paginator/paginar';

@Component({
  selector: 'app-alertas-manutencao',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SkeletonComponent, DecimalPipe, FormsModule, PageHeaderComponent, DataTableComponent,
    StatusBadgeComponent, EmptyStateComponent, ButtonComponent, PaginatorComponent, DensityToggleComponent,
  ],
  templateUrl: './alertas-manutencao.page.html',
})
export class AlertasManutencaoPage implements OnInit {
  /** Filtros e paginação moram na URL (link copiável, "voltar" funciona). */
  readonly url = estadoNaUrl({
    q: texto(),
    status: texto(),
    pagina: inteiro(1),
    tam: inteiroEm(TAMANHOS_DE_PAGINA, TAMANHO_PADRAO),
  });
  readonly filtros = this.url.valores;

  readonly alertas = signal<AlertaManutencao[]>([]);
  readonly loading = signal(true);
  readonly erro = signal<string | null>(null);
  /** Ação em andamento: desabilita os dois botões. */
  readonly acao = signal<'verificar' | 'reprocessar' | null>(null);

  readonly temFiltro = computed(() => !!this.filtros().q || !!this.filtros().status);

  readonly alertasFiltrados = computed(() => {
    const termo = this.filtros().q.trim().toLowerCase();
    const status = this.filtros().status;
    return this.alertas().filter(
      (a) => (!termo || a.placa.toLowerCase().includes(termo)) && (!status || a.status === status)
    );
  });

  readonly pagina = computed(() => paginar(this.alertasFiltrados(), this.filtros().pagina, this.filtros().tam));

  private readonly alertasApi = inject(AlertasManutencaoApiService);
  private readonly toast = inject(ToastService);

  /** A busca por placa só vai para a URL ~250 ms depois da última tecla. */
  private readonly digitado$ = new Subject<string>();

  constructor() {
    this.digitado$
      .pipe(debounceTime(250), takeUntilDestroyed())
      .subscribe((q) => this.url.definir({ q, pagina: 1 }, { substituir: true }));
  }

  ngOnInit(): void {
    this.carregar();
  }

  async carregar(): Promise<void> {
    this.loading.set(true);
    this.erro.set(null);
    try {
      this.alertas.set(await firstValueFrom(this.alertasApi.listar()));
    } catch (e) {
      this.alertas.set([]);
      this.erro.set(ApiError.de(e).mensagem);
    }
    this.loading.set(false);
  }

  async verificarAgora(): Promise<void> {
    this.acao.set('verificar');
    try {
      const { criados } = await firstValueFrom(this.alertasApi.verificar());
      this.toast.sucesso(
        criados > 0
          ? `${criados} alerta(s) de manutenção criado(s).`
          : 'Verificação concluída: nenhum veículo novo precisa de manutenção.'
      );
    } catch (e) {
      this.toast.erro(ApiError.de(e).mensagem);
      this.acao.set(null);
      return;
    }
    this.acao.set(null);
    await this.carregar();
  }

  async reenviarPendentes(): Promise<void> {
    this.acao.set('reprocessar');
    try {
      const { reprocessados, enviados } = await firstValueFrom(this.alertasApi.reprocessar());
      this.toast.sucesso(
        reprocessados > 0
          ? `${enviados} de ${reprocessados} alerta(s) reenviado(s) com sucesso.`
          : 'Não há alertas pendentes para reenviar.'
      );
    } catch (e) {
      this.toast.erro(ApiError.de(e).mensagem);
      this.acao.set(null);
      return;
    }
    this.acao.set(null);
    await this.carregar();
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
}
