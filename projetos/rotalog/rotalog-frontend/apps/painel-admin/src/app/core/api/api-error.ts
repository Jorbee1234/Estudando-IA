import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';

/** Erro de API tipado: a UI distingue "vazio" de "API fora do ar". */
export class ApiError extends Error {
  constructor(
    /** Status HTTP; 0 = sem conexão; 408 = tempo esgotado. */
    readonly status: number,
    readonly mensagem: string
  ) {
    super(mensagem);
    this.name = 'ApiError';
  }

  static de(erro: unknown): ApiError {
    if (erro instanceof ApiError) return erro;
    if (erro instanceof TimeoutError) {
      return new ApiError(408, 'O servidor demorou demais para responder.');
    }
    if (erro instanceof HttpErrorResponse) {
      if (erro.status === 0) {
        return new ApiError(
          0,
          'Não foi possível conectar ao servidor. Verifique se a API está no ar.'
        );
      }
      return new ApiError(erro.status, mensagemDoServidor(erro));
    }
    return new ApiError(500, 'Erro inesperado.');
  }
}

function mensagemDoServidor(erro: HttpErrorResponse): string {
  const corpo = erro.error;
  const doCorpo =
    corpo && typeof corpo === 'object'
      ? (corpo.mensagem ?? corpo.message ?? corpo.erro ?? corpo.error)
      : undefined;
  if (typeof doCorpo === 'string' && doCorpo) return doCorpo;
  switch (erro.status) {
    case 400:
      return 'Dados inválidos.';
    case 401:
      return 'Acesso não autorizado.';
    case 403:
      return 'Acesso negado.';
    case 404:
      return 'Não encontrado.';
    default:
      return erro.status >= 500
        ? 'Erro no servidor. Tente novamente.'
        : 'Não foi possível concluir a operação.';
  }
}
