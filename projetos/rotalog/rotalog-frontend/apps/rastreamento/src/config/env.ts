/**
 * Única leitura de configuração do app. `NX_API_URL` é injetada no build pelo Nx.
 * O padrão só existe para desenvolvimento local.
 */
const PADRAO_DESENVOLVIMENTO = 'http://localhost:3000';

export const env = {
  apiUrl: (process.env.NX_API_URL || PADRAO_DESENVOLVIMENTO).replace(/\/+$/, ''),
  pollingMs: 5000,
  timeoutMs: 10000,
} as const;
