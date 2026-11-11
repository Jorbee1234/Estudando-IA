import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { estadoNaUrl, inteiro, inteiroEm } from '../../core/url-state/estado-na-url';
import { PaginatorComponent } from '../../shared/ui/paginator/paginator.component';
import { DensityToggleComponent } from '../../shared/ui/density-toggle/density-toggle.component';
import { paginar, TAMANHO_PADRAO, TAMANHOS_DE_PAGINA } from '../../shared/ui/paginator/paginar';
import { ManutencoesApiService } from '../../core/api/manutencoes-api.service';
import { ApiError } from '../../core/api/api-error';
import { Manutencao } from '../../core/models';
import { DecimalPipe } from '@angular/common';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { DataTableComponent } from '../../shared/ui/data-table/data-table.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { ToastService } from '../../core/notification/toast.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';

@Component({
  selector: 'app-manutencoes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent, DecimalPipe, PageHeaderComponent, DataTableComponent, StatusBadgeComponent, EmptyStateComponent, ButtonComponent, PaginatorComponent, DensityToggleComponent],
  templateUrl: './manutencoes.page.html',
})
export class ManutencoesPage implements OnInit {
  readonly manutencoes = signal<Manutencao[]>([]);

  /** Página e tamanho moram na URL (sem filtros nesta tela). */
  readonly url = estadoNaUrl({ pagina: inteiro(1), tam: inteiroEm(TAMANHOS_DE_PAGINA, TAMANHO_PADRAO) });
  readonly filtros = this.url.valores;
  readonly pagina = computed(() => paginar(this.manutencoes(), this.filtros().pagina, this.filtros().tam));
  readonly loading = signal(true);

  private readonly manutencoesApi = inject(ManutencoesApiService);
  private readonly toast = inject(ToastService);
  readonly erro = signal<string | null>(null);

  ngOnInit(): void {
    this.carregarManutencoes();
  }

  async carregarManutencoes(): Promise<void> {
    this.loading.set(true);
    this.erro.set(null);
    try {
      this.manutencoes.set(await firstValueFrom(this.manutencoesApi.listar()));
    } catch (e) {
      this.manutencoes.set([]);
      this.erro.set(ApiError.de(e).mensagem);
    }
    this.loading.set(false);
  }

  irParaPagina(pagina: number): void {
    this.url.definir({ pagina });
  }

  mudarTamanho(tam: number): void {
    this.url.definir({ tam, pagina: 1 });
  }

  avisarNaoImplementado(): void {
    this.toast.info('Funcionalidade não implementada.');
  }
}
