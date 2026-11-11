import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { VeiculosApiService } from '../../core/api/veiculos-api.service';
import { MotoristasApiService } from '../../core/api/motoristas-api.service';
import { ManutencoesApiService } from '../../core/api/manutencoes-api.service';
import { EntregasApiService } from '../../core/api/entregas-api.service';
import { ApiError } from '../../core/api/api-error';
import {
  Veiculo, Motorista, Entrega, Manutencao,
  StatusEntrega, StatusManutencao, StatusMotorista, StatusVeiculo,
} from '../../core/models';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DonutChartComponent } from '../../shared/ui/charts/donut-chart.component';
import { BarChartComponent } from '../../shared/ui/charts/bar-chart.component';
import {
  calcularAlertas,
  contarCnhEmAtencao,
  contarManutencoesAtrasadas,
  entregasPorStatus,
  frotaPorSituacao,
  manutencoesPorMes,
  pluralizar,
} from './dashboard.dados';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { DataTableComponent } from '../../shared/ui/data-table/data-table.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

const LIMITE_ALERTAS = 6;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent, DonutChartComponent, BarChartComponent, RouterLink, PageHeaderComponent, DataTableComponent, StatusBadgeComponent, EmptyStateComponent],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.css',
})
export class DashboardPage implements OnInit {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly veiculos = signal<Veiculo[]>([]);
  readonly motoristas = signal<Motorista[]>([]);
  readonly entregas = signal<Entrega[]>([]);
  readonly manutencoes = signal<Manutencao[]>([]);

  readonly totalVeiculos = computed(() => this.veiculos().length);
  readonly veiculosAtivos = computed(() => this.veiculos().filter(v => v.status === StatusVeiculo.ATIVO).length);
  // Só INATIVO: veículo em manutenção não é inativo.
  readonly veiculosInativos = computed(() => this.veiculos().filter(v => v.status === StatusVeiculo.INATIVO).length);

  readonly totalMotoristas = computed(() => this.motoristas().length);
  readonly motoristasAtivos = computed(() => this.motoristas().filter(m => m.status === StatusMotorista.ATIVO).length);

  readonly totalEntregas = computed(() => this.entregas().length);
  readonly entregasEmAndamento = computed(() => this.entregas().filter(e => e.status === StatusEntrega.EM_TRANSITO).length);
  readonly ultimasEntregas = computed(() => this.entregas().slice(0, 5));

  readonly totalManutencoes = computed(() => this.manutencoes().length);
  readonly manutencoesPendentes = computed(() => this.manutencoes().filter(m => m.status === StatusManutencao.PENDENTE).length);

  readonly veiculosEmManutencao = computed(() => this.veiculos().filter(v => v.status === StatusVeiculo.MANUTENCAO).length);
  readonly motoristasEmFerias = computed(() => this.motoristas().filter(m => m.status === StatusMotorista.FERIAS).length);

  /** Referência de "hoje" para os alertas; atualizada a cada carga dos dados. */
  readonly hoje = signal(new Date());

  /** Alertas calculados dos dados reais (ADR 0003, D4); antes eram texto fixo no código. */
  readonly alertas = computed(() => calcularAlertas(this.motoristas(), this.manutencoes(), this.veiculos(), this.hoje()));
  /** O dashboard mostra os mais graves; o resto é um clique para a tela de origem. */
  readonly alertasVisiveis = computed(() => this.alertas().slice(0, LIMITE_ALERTAS));
  readonly alertasOcultos = computed(() => Math.max(0, this.alertas().length - LIMITE_ALERTAS));
  readonly cnhEmAtencao = computed(() => contarCnhEmAtencao(this.alertas()));
  readonly manutencoesAtrasadas = computed(() => contarManutencoesAtrasadas(this.alertas()));

  readonly frota = computed(() => frotaPorSituacao(this.veiculos()));
  readonly manutencoesPorMes = computed(() => manutencoesPorMes(this.manutencoes()));
  readonly entregasPorStatus = computed(() => entregasPorStatus(this.entregas()));

  readonly rastreamentoUrl = environment.rastreamentoUrl;
  protected readonly pluralizar = pluralizar;

  private readonly veiculosApi = inject(VeiculosApiService);
  private readonly motoristasApi = inject(MotoristasApiService);
  private readonly manutencoesApi = inject(ManutencoesApiService);
  private readonly entregasApi = inject(EntregasApiService);

  ngOnInit(): void {
    this.carregarDados();
  }

  async carregarDados(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const [veiculos, motoristas, entregas, manutencoes] = await Promise.all([
        firstValueFrom(this.veiculosApi.listar()),
        firstValueFrom(this.motoristasApi.listar()),
        firstValueFrom(this.entregasApi.listar()),
        firstValueFrom(this.manutencoesApi.listar()),
      ]);
      this.hoje.set(new Date());
      this.veiculos.set(veiculos);
      this.motoristas.set(motoristas);
      this.entregas.set(entregas);
      this.manutencoes.set(manutencoes);
    } catch (err) {
      this.error.set(ApiError.de(err).mensagem);
    }
    this.loading.set(false);
  }
}
