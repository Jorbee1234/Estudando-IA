/** Um valor de gráfico. `cor` é um valor CSS, normalmente um token: `var(--grafico-1)`. */
export interface DadoGrafico {
  rotulo: string;
  valor: number;
  cor: string;
}

/** Percentual inteiro (0 a 100); total zero devolve 0 em vez de NaN. */
export function percentual(valor: number, total: number): number {
  return total > 0 ? Math.round((valor / total) * 100) : 0;
}
