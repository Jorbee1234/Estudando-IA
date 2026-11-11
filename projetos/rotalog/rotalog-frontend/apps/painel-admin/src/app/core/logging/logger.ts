/**
 * Único ponto do painel que escreve no console (ADR 0001, D5a). O lint proíbe `console.*`
 * no resto do código, então trocar por um serviço de log externo (Sentry etc.) é mexer só aqui.
 * Registra nome e mensagem, nunca o objeto inteiro (que pode carregar dados da resposta).
 */
export function registrarErro(contexto: string, erro: unknown): void {
  const detalhe = erro instanceof Error ? `${erro.name}: ${erro.message}` : 'erro desconhecido';
  // eslint-disable-next-line no-console
  console.error(`[${contexto}] ${detalhe}`);
}
