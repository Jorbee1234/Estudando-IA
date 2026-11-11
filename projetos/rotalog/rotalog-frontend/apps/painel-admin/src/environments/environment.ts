// Sem segredos aqui (ADR 0001, D5a). As URLs já incluem o context-path /api.
export const environment = {
  production: false,
  apiFrotasUrl: 'http://localhost:8080/api',
  apiEntregasUrl: 'http://localhost:3000/api',
  /** Portal de rastreamento (app React). O painel só aponta para ele; não há mapa aqui. */
  rastreamentoUrl: 'http://localhost:3001',
  /** Tempo máximo de uma requisição, em ms. */
  timeoutMs: 10000,
  /**
   * Autenticação (ADR 0001, D5b). Desligada até as APIs validarem token (MAPA T2): com ativa=false
   * não há login, guard nem cabeçalho Authorization. loginUrl é o endpoint que recebe
   * { usuario, senha } e devolve { token }; ele ainda não existe em nenhuma API.
   */
  autenticacao: { ativa: false, loginUrl: '' },
};
