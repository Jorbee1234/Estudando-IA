import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Título da página (h1) + área de ações projetada. */
@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.component.html',
})
export class PageHeaderComponent {
  readonly titulo = input.required<string>();
}
