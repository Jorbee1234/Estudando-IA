import { env } from '../config/env';
import { ApiError } from './ApiError';

interface Opcoes {
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * GET JSON com timeout, cancelamento e erro tipado. Não engole erro:
 * qualquer falha (rede, status != 2xx, JSON inválido) vira `ApiError`.
 */
export async function getJson(caminho: string, { signal, timeoutMs = env.timeoutMs }: Opcoes = {}): Promise<unknown> {
  const controlador = new AbortController();
  let expirou = false;
  const timer = setTimeout(() => {
    expirou = true;
    controlador.abort();
  }, timeoutMs);
  const aoCancelar = () => controlador.abort();
  if (signal?.aborted) controlador.abort();
  signal?.addEventListener('abort', aoCancelar);

  try {
    const resposta = await fetch(`${env.apiUrl}${caminho}`, { signal: controlador.signal });
    if (!resposta.ok) {
      throw new ApiError(await mensagemDeErro(resposta), { status: resposta.status });
    }
    try {
      return await resposta.json();
    } catch (causa) {
      throw new ApiError('Resposta da API não é um JSON válido', { status: resposta.status, cause: causa });
    }
  } catch (causa) {
    if (causa instanceof ApiError) throw causa;
    if (expirou) throw new ApiError('A API demorou demais para responder', { cause: causa });
    if (signal?.aborted) throw causa; // cancelamento é intencional: quem chamou decide
    throw new ApiError('Não foi possível falar com a API', { cause: causa });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', aoCancelar);
  }
}

async function mensagemDeErro(resposta: Response): Promise<string> {
  try {
    const corpo = (await resposta.json()) as { error?: unknown };
    if (typeof corpo?.error === 'string') return corpo.error;
  } catch {
    /* corpo sem JSON: usa a mensagem padrão */
  }
  return `A API respondeu com erro ${resposta.status}`;
}
