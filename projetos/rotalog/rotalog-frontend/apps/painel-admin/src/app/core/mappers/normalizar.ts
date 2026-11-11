// Normalização de caixa só na borda (ADR 0001, D3): a API é a fonte de verdade,
// mas aceita-se minúsculas e espaços sem espalhar remendos pelas telas.
// Valor desconhecido é mantido (em maiúsculas), nunca trocado por outro status,
// para não esconder dado novo da API. O STATUS_CONFIG mostra um rótulo neutro.
export function normalizarEnum<T extends string>(
  valor: string | null | undefined,
  valoresValidos: readonly string[],
  padrao: T
): T {
  if (valor == null) return padrao;
  const v = valor.trim().toUpperCase();
  return (valoresValidos.includes(v) ? v : v || padrao) as T;
}

export function paraNumero(valor: number | string | null | undefined): number {
  if (valor == null || valor === '') return 0;
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}
