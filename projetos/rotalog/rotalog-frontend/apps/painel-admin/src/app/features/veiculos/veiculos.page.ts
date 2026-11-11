import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, firstValueFrom, Subject } from 'rxjs';
import { VeiculosApiService } from '../../core/api/veiculos-api.service';
import { ApiError } from '../../core/api/api-error';
import { StatusVeiculo, Veiculo } from '../../core/models';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { DataTableComponent } from '../../shared/ui/data-table/data-table.component';
import { SortableHeaderComponent, Ordem } from '../../shared/ui/sortable-header/sortable-header.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PaginatorComponent } from '../../shared/ui/paginator/paginator.component';
import { DensityToggleComponent } from '../../shared/ui/density-toggle/density-toggle.component';
import { paginar, TAMANHO_PADRAO, TAMANHOS_DE_PAGINA } from '../../shared/ui/paginator/paginar';
import { estadoNaUrl, inteiro, inteiroEm, inteiroOuNulo, texto } from '../../core/url-state/estado-na-url';
import { ToastService } from '../../core/notification/toast.service';
import { ConfirmService } from '../../core/notification/confirm.service';
import { FocoAoAbrirDirective } from '../../shared/ui/foco/foco-ao-abrir.directive';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { FormFieldComponent, FormControlDirective } from '../../shared/ui/form-field/form-field.component';

const CAMPOS_ORDENAVEIS = ['id', 'placa', 'modelo'] as const;
type CampoOrdem = (typeof CAMPOS_ORDENAVEIS)[number];

@Component({
  selector: 'app-veiculos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent, DecimalPipe, FormsModule, ReactiveFormsModule, FocoAoAbrirDirective, PageHeaderComponent, DataTableComponent, StatusBadgeComponent, EmptyStateComponent, ButtonComponent, FormFieldComponent, FormControlDirective, SortableHeaderComponent, PaginatorComponent, DensityToggleComponent],
  templateUrl: './veiculos.page.html',
})
export class VeiculosPage implements OnInit {
  readonly StatusVeiculo = StatusVeiculo;

  /** Busca, filtro, ordem, página e item aberto moram na URL (link copiável, "voltar" funciona). */
  readonly url = estadoNaUrl({
    q: texto(),
    status: texto(),
    ordem: texto(),
    pagina: inteiro(1),
    tam: inteiroEm(TAMANHOS_DE_PAGINA, TAMANHO_PADRAO),
    id: inteiroOuNulo(),
  });
  readonly filtros = this.url.valores;

  readonly veiculos = signal<Veiculo[]>([]);
  readonly loading = signal(true);
  readonly erro = signal<string | null>(null);
  readonly mostrandoForm = signal(false);
  readonly editando = signal(false);

  /** "campo:direcao" da URL; valor inválido (URL editada à mão) vira "sem ordem". */
  readonly ordemAtual = computed<{ campo: CampoOrdem; direcao: 'asc' | 'desc' } | null>(() => {
    const [campo, direcao] = this.filtros().ordem.split(':');
    const valido = (CAMPOS_ORDENAVEIS as readonly string[]).includes(campo) && (direcao === 'asc' || direcao === 'desc');
    return valido ? { campo: campo as CampoOrdem, direcao: direcao as 'asc' | 'desc' } : null;
  });

  readonly temFiltro = computed(() => !!this.filtros().q || !!this.filtros().status);

  /** Filtro e ordenação derivados da lista: mudar a busca mantém a ordem escolhida. */
  readonly veiculosFiltrados = computed(() => {
    const termo = this.filtros().q.toLowerCase();
    const status = this.filtros().status;
    const filtrados = this.veiculos().filter((v) => {
      const matchBusca = !termo ||
        v.placa.toLowerCase().includes(termo) ||
        v.modelo.toLowerCase().includes(termo);
      return matchBusca && (!status || v.status === status);
    });
    const ordem = this.ordemAtual();
    if (!ordem) return filtrados;
    const sinal = ordem.direcao === 'asc' ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      const va = a[ordem.campo];
      const vb = b[ordem.campo];
      if (va < vb) return -1 * sinal;
      if (va > vb) return 1 * sinal;
      return 0;
    });
  });

  readonly pagina = computed(() => paginar(this.veiculosFiltrados(), this.filtros().pagina, this.filtros().tam));

  readonly veiculoSelecionado = computed(() => {
    const id = this.filtros().id;
    return id === null ? null : (this.veiculos().find((v) => v.id === id) ?? null);
  });

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    placa: ['', Validators.required],
    modelo: ['', Validators.required],
    ano: [2024],
    km_atual: [0],
  });

  /** Vira true no primeiro envio; a partir daí campos inválidos mostram o erro. */
  readonly submetido = signal(false);

  private editandoId: number | null = null;
  private veiculoEmEdicao: Veiculo | null = null;

  private readonly veiculosApi = inject(VeiculosApiService);
  private readonly confirmService = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  /** A busca só vai para a URL ~250 ms depois da última tecla. */
  private readonly digitado$ = new Subject<string>();

  constructor() {
    this.digitado$
      .pipe(debounceTime(250), takeUntilDestroyed())
      .subscribe((q) => this.url.definir({ q, pagina: 1 }, { substituir: true }));
  }

  ngOnInit(): void {
    this.carregarVeiculos();
  }

  async carregarVeiculos(): Promise<void> {
    this.loading.set(true);
    this.erro.set(null);
    try {
      this.veiculos.set(await firstValueFrom(this.veiculosApi.listar()));
    } catch (e) {
      this.veiculos.set([]);
      this.erro.set(ApiError.de(e).mensagem);
    }
    this.loading.set(false);
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

  /** Primeiro clique ordena de forma crescente; clicar de novo na mesma coluna inverte. */
  ordenar(campo: string): void {
    const atual = this.ordemAtual();
    const direcao = atual?.campo === campo && atual.direcao === 'asc' ? 'desc' : 'asc';
    this.url.definir({ ordem: `${campo}:${direcao}`, pagina: 1 });
  }

  /** Mesma ordenação, pelo seletor das telas estreitas (onde o cabeçalho some). */
  ordenarPor(ordem: string): void {
    this.url.definir({ ordem, pagina: 1 });
  }

  ordemDe(campo: string): Ordem {
    const atual = this.ordemAtual();
    return atual?.campo === campo ? atual.direcao : null;
  }

  selecionarVeiculo(veiculo: Veiculo): void {
    this.url.definir({ id: veiculo.id });
  }

  fecharDetalhe(): void {
    this.url.definir({ id: null });
  }

  /** Mensagem do campo, só depois que ele foi tocado ou o envio foi tentado. */
  erroDe(campo: 'placa' | 'modelo'): string | null {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || this.submetido()) ? 'Campo obrigatório.' : null;
  }

  mostrarFormulario(): void {
    this.mostrandoForm.set(true);
    this.editando.set(false);
    this.editandoId = null;
    this.veiculoEmEdicao = null;
    this.submetido.set(false);
    this.form.reset();
  }

  editarVeiculo(veiculo: Veiculo): void {
    this.mostrandoForm.set(true);
    this.editando.set(true);
    this.editandoId = veiculo.id;
    this.veiculoEmEdicao = veiculo;
    this.submetido.set(false);
    this.form.reset();
    this.form.patchValue(veiculo);
  }

  cancelarForm(): void {
    this.mostrandoForm.set(false);
    this.editando.set(false);
    this.editandoId = null;
    this.veiculoEmEdicao = null;
  }

  async salvarVeiculo(event: Event): Promise<void> {
    event.preventDefault();

    this.submetido.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Leva o foco ao primeiro campo com erro (WCAG 3.3.1).
      const primeiro = (['placa', 'modelo'] as const).find((n) => this.form.controls[n].invalid);
      document.querySelector<HTMLElement>(`form [formControlName="${primeiro}"]`)?.focus();
      return;
    }

    const dados = { ...this.veiculoEmEdicao, ...this.form.getRawValue() } as Partial<Veiculo>;
    this.erro.set(null);
    try {
      if (this.editando() && this.editandoId) {
        await firstValueFrom(this.veiculosApi.atualizar(this.editandoId, dados));
      } else {
        await firstValueFrom(this.veiculosApi.criar(dados));
      }
    } catch (e) {
      // Falha: o formulário continua aberto, com os dados digitados.
      this.erro.set(ApiError.de(e).mensagem);
      return;
    }

    this.cancelarForm();
    await this.carregarVeiculos();
  }

  /** A API não exclui: desativa (PATCH .../desativar). O veículo continua na lista como INATIVO. */
  async confirmarDesativacao(veiculo: Veiculo): Promise<void> {
    const confirmado = await this.confirmService.confirmar({
      titulo: 'Desativar veículo',
      mensagem: `Deseja desativar o veículo ${veiculo.placa}? Ele deixa de ficar disponível para entregas.`,
      confirmar: 'Desativar',
      perigo: true,
    });
    if (!confirmado) return;
    await this.alterarStatus(() => this.veiculosApi.desativar(veiculo.id), `Veículo ${veiculo.placa} desativado.`);
  }

  /**
   * Só para veículos INATIVO (o botão nem aparece nos demais): a API reativa para ATIVO a partir
   * de qualquer estado, o que tiraria um veículo em MANUTENCAO dessa situação.
   */
  async confirmarReativacao(veiculo: Veiculo): Promise<void> {
    if (veiculo.status !== StatusVeiculo.INATIVO) return;
    const confirmado = await this.confirmService.confirmar({
      titulo: 'Reativar veículo',
      mensagem: `Deseja reativar o veículo ${veiculo.placa}? Ele volta a ficar disponível para entregas.`,
      confirmar: 'Reativar',
    });
    if (!confirmado) return;
    await this.alterarStatus(() => this.veiculosApi.reativar(veiculo.id), `Veículo ${veiculo.placa} reativado.`);
  }

  private async alterarStatus(chamada: () => ReturnType<VeiculosApiService['desativar']>, sucesso: string): Promise<void> {
    this.erro.set(null);
    try {
      await firstValueFrom(chamada());
    } catch (e) {
      this.erro.set(ApiError.de(e).mensagem);
      return;
    }
    this.toast.sucesso(sucesso);
    await this.carregarVeiculos();
  }
}
