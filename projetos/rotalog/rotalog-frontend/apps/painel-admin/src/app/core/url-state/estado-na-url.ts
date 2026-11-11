import { DestroyRef, inject, signal, Signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

/** Um parâmetro de URL: como ler do texto da query e como escrever (null = remove da URL). */
export interface Campo<V> {
  readonly padrao: V;
  ler(bruto: string | null): V;
  escrever(valor: V): string | null;
}

/** Texto livre; vazio (ou igual ao padrão) some da URL. */
export const texto = (padrao = ''): Campo<string> => ({
  padrao,
  ler: (bruto) => bruto ?? padrao,
  escrever: (v) => (v === padrao || v === '' ? null : v),
});

/** Inteiro >= min; texto inválido cai no padrão (URL editada à mão não quebra a tela). */
export const inteiro = (padrao: number, min = 1): Campo<number> => ({
  padrao,
  ler: (bruto) => {
    const n = Number(bruto);
    return bruto !== null && Number.isInteger(n) && n >= min ? n : padrao;
  },
  escrever: (v) => (v === padrao ? null : String(v)),
});

/** Inteiro que só aceita valores de uma lista (ex.: tamanhos de página 10/25/50). */
export const inteiroEm = (permitidos: readonly number[], padrao: number): Campo<number> => ({
  padrao,
  ler: (bruto) => {
    const n = Number(bruto);
    return bruto !== null && permitidos.includes(n) ? n : padrao;
  },
  escrever: (v) => (v === padrao ? null : String(v)),
});

/** Id opcional (item aberto): null = nada aberto. */
export const inteiroOuNulo = (): Campo<number | null> => ({
  padrao: null,
  ler: (bruto) => {
    const n = Number(bruto);
    return bruto !== null && Number.isInteger(n) && n > 0 ? n : null;
  },
  escrever: (v) => (v === null ? null : String(v)),
});

type Esquema = Record<string, Campo<unknown>>;
export type Valores<S extends Esquema> = { [K in keyof S]: S[K] extends Campo<infer V> ? V : never };

export interface OpcoesDefinir {
  /**
   * Troca a entrada do histórico em vez de empilhar uma nova. Use para o que muda a cada
   * tecla (busca); deixe falso para o que o "voltar" deve desfazer (página, item aberto).
   */
  substituir?: boolean;
}

/**
 * Estado de uma tela guardado na query string (ADR 0003, D3): link copiável, recarregar
 * mantém o contexto e o botão "voltar" desfaz a última mudança. O signal é a fonte da UI e
 * atualiza na hora; a URL acompanha e, se mudar por fora (voltar/avançar), o signal a segue.
 * Só vale em contexto de injeção (construtor/inicializador de campo).
 */
export function estadoNaUrl<S extends Esquema>(esquema: S) {
  const rota = inject(ActivatedRoute);
  const router = inject(Router);
  const chaves = Object.keys(esquema) as (keyof S & string)[];

  const lerDaUrl = (params: { get(nome: string): string | null }): Valores<S> =>
    Object.fromEntries(chaves.map((k) => [k, esquema[k].ler(params.get(k))])) as Valores<S>;

  const valores = signal<Valores<S>>(lerDaUrl(rota.snapshot.queryParamMap));

  const sub = rota.queryParamMap.subscribe((params) => {
    const novos = lerDaUrl(params);
    const atuais = valores();
    if (chaves.some((k) => !Object.is(novos[k], atuais[k]))) valores.set(novos);
  });
  inject(DestroyRef).onDestroy(() => sub.unsubscribe());

  function definir(parcial: Partial<Valores<S>>, opcoes: OpcoesDefinir = {}): Promise<boolean> {
    const novos = { ...valores(), ...parcial } as Valores<S>;
    valores.set(novos);
    const queryParams = Object.fromEntries(chaves.map((k) => [k, esquema[k].escrever(novos[k])]));
    return router.navigate([], {
      relativeTo: rota,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: opcoes.substituir ?? false,
    });
  }

  return { valores: valores as Signal<Valores<S>>, definir };
}
