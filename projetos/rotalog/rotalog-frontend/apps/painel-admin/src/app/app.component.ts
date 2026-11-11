import { DOCUMENT } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './features/layout/sidebar.component';
import { ToasterComponent } from './shared/ui/toaster/toaster.component';
import { ConfirmDialogComponent } from './shared/ui/confirm-dialog/confirm-dialog.component';
// Instanciar aqui garante que o tema salvo seja aplicado desde o início.
import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/theme/theme.service';
import { DensityService } from './core/density/density.service';

@Component({
  standalone: true,
  imports: [SidebarComponent, RouterOutlet, ToasterComponent, ConfirmDialogComponent],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'RotaLog - Painel Administrativo';

  private readonly doc = inject(DOCUMENT);
  private readonly auth = inject(AuthService);

  /** Sem sessão (tela de login) não há menu para navegar. */
  protected readonly comMenu = computed(() => !this.auth.ativa || this.auth.autenticado());

  constructor() {
    inject(ThemeService);
    // Aplica a densidade salva (data-densidade no <html>) desde o início.
    inject(DensityService);
  }

  /** O href="#conteudo" recarregaria a rota por causa do <base href>: foca o <main> direto. */
  irParaConteudo(evento: Event): void {
    evento.preventDefault();
    this.doc.getElementById('conteudo')?.focus();
  }
}
