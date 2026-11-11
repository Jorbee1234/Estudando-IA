import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  inject,
  input,
} from '@angular/core';

let proximoId = 0;

/**
 * Campo de formulário acessível: associa <label for> ao controle, marca
 * obrigatoriedade e liga a mensagem de erro/ajuda via aria-describedby.
 *
 * <app-form-field label="Placa" [obrigatorio]="true" [erro]="erro">
 *   <input appControl [(ngModel)]="placa" name="placa" />
 * </app-form-field>
 */
@Component({
  selector: 'app-form-field',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form-field.component.html',
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly obrigatorio = input(false);
  readonly erro = input<string | null>(null);
  readonly ajuda = input<string | null>(null);

  readonly id = `campo-${++proximoId}`;
  readonly idMensagem = `${this.id}-msg`;
}

/** Marca o controle projetado e aplica id, aria-required, aria-invalid e aria-describedby. */
@Directive({
  selector: '[appControl]',
  standalone: true,
  host: {
    '[id]': 'campo.id',
    '[attr.aria-required]': 'campo.obrigatorio() ? "true" : null',
    '[attr.aria-invalid]': 'campo.erro() ? "true" : null',
    '[attr.aria-describedby]':
      '(campo.erro() || campo.ajuda()) ? campo.idMensagem : null',
  },
})
export class FormControlDirective {
  protected readonly campo = inject(FormFieldComponent);
}
