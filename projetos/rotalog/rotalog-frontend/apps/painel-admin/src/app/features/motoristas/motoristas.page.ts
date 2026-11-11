import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, firstValueFrom, Subject } from 'rxjs';
import { MotoristasApiService } from '../../core/api/motoristas-api.service';
import { ApiError } from '../../core/api/api-error';
import { Motorista } from '../../core/models';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { DataTableComponent } from '../../shared/ui/data-table/data-table.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { PaginatorComponent } from '../../shared/ui/paginator/paginator.component';
import { DensityToggleComponent } from '../../shared/ui/density-toggle/density-toggle.component';
import { paginar, TAMANHO_PADRAO, TAMANHOS_DE_PAGINA } from '../../shared/ui/paginator/paginar';
import { estadoNaUrl, inteiro, inteiroEm, texto } from '../../core/url-state/estado-na-url';
import { FocoAoAbrirDirective } from '../../shared/ui/foco/foco-ao-abrir.directive';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { FormFieldComponent, FormControlDirective } from '../../shared/ui/form-field/form-field.component';

@Component({
  selector: 'app-motoristas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SkeletonComponent, FormsModule, ReactiveFormsModule, FocoAoAbrirDirective, PageHeaderComponent, DataTableComponent, StatusBadgeComponent, EmptyStateComponent, ButtonComponent, FormFieldComponent, FormControlDirective, PaginatorComponent, DensityToggleComponent],
  templateUrl: './motoristas.page.html',
  styleUrl: './motoristas.page.css',
})
export class MotoristasPage implements OnInit {
  readonly motoristas = signal<Motorista[]>([]);
  readonly loading = signal(true);
  readonly mostrandoForm = signal(false);
  readonly editando = signal(false);
  /** Busca, status e página moram na URL (link copiável, "voltar" funciona). */
  readonly url = estadoNaUrl({
    q: texto(),
    status: texto(),
    pagina: inteiro(1),
    tam: inteiroEm(TAMANHOS_DE_PAGINA, TAMANHO_PADRAO),
  });
  readonly filtros = this.url.valores;
  readonly temFiltro = computed(() => !!this.filtros().q || !!this.filtros().status);

  /** A busca só vai para a URL ~250 ms depois da última tecla. */
  private readonly digitado$ = new Subject<string>();

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    cnh: ['', Validators.required],
    categoria_cnh: ['B'],
    validade_cnh: [''],
  });

  /** Vira true no primeiro envio; a partir daí campos inválidos mostram o erro. */
  readonly submetido = signal(false);
  private motoristaEmEdicao: Motorista | null = null;

  private editandoId: number | null = null;

  private readonly motoristasApi = inject(MotoristasApiService);
  readonly erro = signal<string | null>(null);

  constructor() {
    this.digitado$
      .pipe(debounceTime(250), takeUntilDestroyed())
      .subscribe((q) => this.url.definir({ q, pagina: 1 }, { substituir: true }));
  }

  ngOnInit(): void {
    this.carregarMotoristas();
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

  async carregarMotoristas(): Promise<void> {
    this.loading.set(true);
    this.erro.set(null);
    try {
      this.motoristas.set(await firstValueFrom(this.motoristasApi.listar()));
    } catch (e) {
      this.motoristas.set([]);
      this.erro.set(ApiError.de(e).mensagem);
    }
    this.loading.set(false);
  }

  readonly motoristasFiltrados = computed(() => {
    const termo = this.filtros().q.toLowerCase();
    const status = this.filtros().status;
    return this.motoristas().filter(m => {
      const matchBusca = !termo ||
        m.nome.toLowerCase().includes(termo) ||
        m.cnh.includes(this.filtros().q);
      return matchBusca && (!status || m.status === status);
    });
  });

  readonly pagina = computed(() => paginar(this.motoristasFiltrados(), this.filtros().pagina, this.filtros().tam));

  isCnhVencida(motorista: Motorista): boolean {
    if (!motorista.validade_cnh) return false;
    return new Date(motorista.validade_cnh) < new Date();
  }

  /** Mensagem do campo, só depois que ele foi tocado ou o envio foi tentado. */
  erroDe(campo: 'nome' | 'cnh'): string | null {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || this.submetido()) ? 'Campo obrigatório.' : null;
  }

  mostrarFormulario(): void {
    this.mostrandoForm.set(true);
    this.editando.set(false);
    this.editandoId = null;
    this.motoristaEmEdicao = null;
    this.submetido.set(false);
    this.form.reset();
  }

  editarMotorista(motorista: Motorista): void {
    this.mostrandoForm.set(true);
    this.editando.set(true);
    this.editandoId = motorista.id;
    this.motoristaEmEdicao = motorista;
    this.submetido.set(false);
    this.form.reset();
    this.form.patchValue(motorista);
  }

  cancelarForm(): void {
    this.mostrandoForm.set(false);
    this.editando.set(false);
    this.editandoId = null;
    this.motoristaEmEdicao = null;
  }

  async salvarMotorista(event: Event): Promise<void> {
    event.preventDefault();
    this.submetido.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Leva o foco ao primeiro campo com erro (WCAG 3.3.1).
      const primeiro = (['nome', 'cnh'] as const).find((n) => this.form.controls[n].invalid);
      document.querySelector<HTMLElement>(`form [formControlName="${primeiro}"]`)?.focus();
      return;
    }
    const dados = { ...this.motoristaEmEdicao, ...this.form.getRawValue() } as Partial<Motorista>;
    this.erro.set(null);
    try {
      if (this.editando() && this.editandoId) {
        await firstValueFrom(this.motoristasApi.atualizar(this.editandoId, dados));
      } else {
        await firstValueFrom(this.motoristasApi.criar(dados));
      }
    } catch (e) {
      // Falha: o formulário continua aberto, com os dados digitados.
      this.erro.set(ApiError.de(e).mensagem);
      return;
    }
    this.cancelarForm();
    await this.carregarMotoristas();
  }
}
