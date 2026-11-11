import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-nao-encontrado',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent],
  template: `
    <div class="page">
      <app-page-header titulo="Página não encontrada" />
      <p>O endereço que você tentou abrir não existe neste painel.</p>
      <p><a routerLink="/dashboard">Voltar ao dashboard</a></p>
    </div>
  `,
})
export class NaoEncontradoPage {}
