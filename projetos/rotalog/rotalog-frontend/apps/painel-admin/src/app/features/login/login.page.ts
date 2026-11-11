import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../core/api/api-error';
import { retornoSeguro } from '../../core/auth/auth.guard';
import { AuthService } from '../../core/auth/auth.service';
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { FormControlDirective, FormFieldComponent } from '../../shared/ui/form-field/form-field.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PageHeaderComponent, ButtonComponent, FormFieldComponent, FormControlDirective],
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly rota = inject(ActivatedRoute);

  readonly form = inject(FormBuilder).nonNullable.group({
    usuario: ['', Validators.required],
    senha: ['', Validators.required],
  });
  readonly submetido = signal(false);
  readonly enviando = signal(false);
  readonly erro = signal<string | null>(null);

  erroDe(campo: 'usuario' | 'senha'): string | null {
    const c = this.form.controls[campo];
    return c.invalid && (c.touched || this.submetido()) ? 'Campo obrigatório.' : null;
  }

  async entrar(evento: Event): Promise<void> {
    evento.preventDefault();
    this.submetido.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const primeiro = (['usuario', 'senha'] as const).find((n) => this.form.controls[n].invalid);
      document.querySelector<HTMLElement>(`form [formControlName="${primeiro}"]`)?.focus();
      return;
    }
    this.erro.set(null);
    this.enviando.set(true);
    try {
      const { usuario, senha } = this.form.getRawValue();
      await firstValueFrom(this.auth.login(usuario, senha));
    } catch (e) {
      // Não revela se foi o usuário ou a senha que falhou.
      const status = ApiError.de(e).status;
      this.erro.set(
        status === 401 || status === 403 ? 'Usuário ou senha inválidos.' : ApiError.de(e).mensagem
      );
      this.form.controls.senha.reset();
      this.enviando.set(false);
      return;
    }
    this.enviando.set(false);
    await this.router.navigateByUrl(retornoSeguro(this.rota.snapshot.queryParamMap.get('retorno')));
  }
}
