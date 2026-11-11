import { computed, inject, Injectable, signal } from '@angular/core';
import { map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiClient } from '../api/api-client';
import { ApiError } from '../api/api-error';

const CHAVE = 'rotalog.token';

/** Lê o corpo de um JWT sem validar a assinatura: quem valida é o servidor. */
function lerCorpo(token: string): Record<string, unknown> | null {
  try {
    const corpo = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return corpo && typeof corpo === 'object' ? corpo : null;
  } catch {
    return null;
  }
}

/** Lê o `exp` (segundos) de um JWT e devolve em ms; null se não houver ou o token for inválido. */
export function expiracaoDoToken(token: string): number | null {
  const exp = lerCorpo(token)?.['exp'];
  return typeof exp === 'number' ? exp * 1000 : null;
}

/**
 * Nome para mostrar no menu, a partir das claims mais comuns (a API de login ainda não existe,
 * então o contrato é uma suposição: ADR 0001, D5b). Só texto: nunca vira HTML.
 */
export function nomeDoToken(token: string | null): string | null {
  if (!token) return null;
  const corpo = lerCorpo(token);
  if (!corpo) return null;
  for (const chave of ['name', 'nome', 'preferred_username', 'username', 'sub']) {
    const valor = corpo[chave];
    if (typeof valor === 'string' && valor.trim()) return valor.trim().slice(0, 40);
  }
  return null;
}

/**
 * Sessão do painel (ADR 0001, D5b). Desligada por `environment.autenticacao.ativa` até as APIs
 * validarem token (MAPA T2). O token fica em sessionStorage: some ao fechar a aba, mas continua
 * legível por qualquer script da página, então depende da CSP e da ausência de XSS.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiClient);

  readonly ativa = environment.autenticacao.ativa;
  private readonly _token = signal<string | null>(this.lerSalvo());
  readonly token = this._token.asReadonly();
  /** Nome do usuário logado para o rodapé do menu; null sem sessão ou sem claim de nome. */
  readonly usuario = computed(() => (this.autenticado() ? nomeDoToken(this._token()) : null));
  readonly autenticado = computed(() => {
    const t = this._token();
    if (!t) return false;
    const exp = expiracaoDoToken(t);
    return exp === null || exp > Date.now();
  });

  /** O contrato do endpoint de login ainda não existe: assume POST { usuario, senha } -> { token }. */
  login(usuario: string, senha: string): Observable<void> {
    const url = environment.autenticacao.loginUrl;
    if (!url) return throwError(() => new ApiError(500, 'Login não configurado.'));
    return this.api.post<{ token: string }>(url, '', { usuario, senha }).pipe(
      map(({ token }) => {
        this._token.set(token);
        this.salvar(token);
      })
    );
  }

  sair(): void {
    this._token.set(null);
    this.salvar(null);
  }

  private lerSalvo(): string | null {
    try {
      return sessionStorage.getItem(CHAVE);
    } catch {
      return null;
    }
  }

  private salvar(token: string | null): void {
    try {
      if (token) sessionStorage.setItem(CHAVE, token);
      else sessionStorage.removeItem(CHAVE);
    } catch {
      // Armazenamento bloqueado: a sessão vale só até recarregar.
    }
  }
}
