export const TAMANHOS_DE_PAGINA = [10, 25, 50] as const;
export const TAMANHO_PADRAO = 10;

export interface Pagina<T> {
  itens: T[];
  total: number;
  /** Página efetiva (1 a totalPaginas): uma URL com ?pagina=99 cai na última. */
  pagina: number;
  totalPaginas: number;
  tamanho: number;
  /** Posição do primeiro e do último item mostrado, a partir de 1 (0 e 0 se vazio). */
  de: number;
  ate: number;
}

/** Fatia uma lista já filtrada e ordenada. Pura: a lista de origem não é alterada. */
export function paginar<T>(lista: readonly T[], pagina: number, tamanho: number): Pagina<T> {
  const total = lista.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const atual = Math.min(Math.max(1, Math.floor(pagina) || 1), totalPaginas);
  const inicio = (atual - 1) * tamanho;
  const itens = lista.slice(inicio, inicio + tamanho);
  return {
    itens,
    total,
    pagina: atual,
    totalPaginas,
    tamanho,
    de: total === 0 ? 0 : inicio + 1,
    ate: inicio + itens.length,
  };
}
