import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { SidebarStateService } from '../../core/layout/sidebar-state.service';
import { ThemeToggleComponent } from '../../shared/ui/theme-toggle/theme-toggle.component';

interface ItemMenu {
  rota: string;
  icone: string;
  rotulo: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, ThemeToggleComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  protected readonly itens: ItemMenu[] = [
    { rota: '/dashboard', icone: '📊', rotulo: 'Dashboard' },
    { rota: '/veiculos', icone: '🚛', rotulo: 'Veículos' },
    { rota: '/motoristas', icone: '👤', rotulo: 'Motoristas' },
    { rota: '/manutencoes', icone: '🔧', rotulo: 'Manutenções' },
    { rota: '/alertas-manutencao', icone: '🔔', rotulo: 'Alertas de manutenção' },
    { rota: '/entregas', icone: '📦', rotulo: 'Entregas' },
  ];

  protected readonly auth = inject(AuthService);
  private readonly estado = inject(SidebarStateService);
  private readonly router = inject(Router);

  /** Só vale em telas estreitas: o menu vira uma barra recolhível. */
  protected readonly aberto = signal(false);

  /** Só vale no desktop: o menu fica só com ícones (o CSS ignora isso em telas estreitas). */
  protected readonly recolhida = this.estado.recolhida;

  /**
   * As dicas dos ícones (menu recolhido) aparecem ao passar o mouse ou focar. Esc as dispensa
   * (WCAG 1.4.13) até o foco ou o ponteiro chegar a outro item.
   */
  protected readonly semDicas = signal(false);

  protected readonly inicial = computed(() => (this.auth.usuario() ?? 'U').charAt(0).toUpperCase());

  @HostListener('document:keydown.escape')
  protected dispensarDicas(): void {
    if (this.recolhida()) this.semDicas.set(true);
  }

  protected reexibirDicas(): void {
    this.semDicas.set(false);
  }

  protected alternar(): void {
    this.aberto.update((v) => !v);
  }

  protected alternarRecolhida(): void {
    this.estado.alternar();
    this.semDicas.set(false);
  }

  protected sair(): void {
    this.auth.sair();
    this.fechar();
    this.router.navigate(['/login']);
  }

  protected fechar(): void {
    this.aberto.set(false);
  }
}
