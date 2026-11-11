/** Único ponto de log do app. Troque a implementação aqui (ex.: Sentry) sem tocar nos componentes. */
export function registrarErro(mensagem: string, ...detalhes: unknown[]): void {
  // eslint-disable-next-line no-console
  console.error(mensagem, ...detalhes);
}
