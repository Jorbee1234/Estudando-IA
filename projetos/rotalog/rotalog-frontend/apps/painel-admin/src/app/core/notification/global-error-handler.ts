import { ErrorHandler, inject, Injectable } from '@angular/core';
import { registrarErro } from '../logging/logger';
import { ToastService } from './toast.service';

/** Erros não tratados viram um aviso genérico na tela; o detalhe vai só para o log. */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly toast = inject(ToastService);

  handleError(erro: unknown): void {
    registrarErro('não tratado', erro);
    this.toast.erro('Ocorreu um erro inesperado. Tente novamente.');
  }
}
