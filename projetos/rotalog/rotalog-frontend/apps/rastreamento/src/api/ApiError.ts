export class ApiError extends Error {
  readonly status: number | null;

  constructor(mensagem: string, opcoes: { status?: number; cause?: unknown } = {}) {
    super(mensagem, { cause: opcoes.cause });
    this.name = 'ApiError';
    this.status = opcoes.status ?? null;
  }
}
