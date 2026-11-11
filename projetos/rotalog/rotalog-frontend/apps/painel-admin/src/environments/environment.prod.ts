// Ajustar para os hosts reais antes do deploy; os valores abaixo são os de desenvolvimento.
export const environment = {
  production: true,
  apiFrotasUrl: 'http://localhost:8080/api',
  apiEntregasUrl: 'http://localhost:3000/api',
  /** Portal de rastreamento (app React). O painel só aponta para ele; não há mapa aqui. */
  rastreamentoUrl: 'http://localhost:3001',
  timeoutMs: 10000,
  /**
   * Autenticação (ADR 0001, D5b). Desligada até as APIs validarem token (MAPA T2): com ativa=false
   * não há login, guard nem cabeçalho Authorization. loginUrl é o endpoint que recebe
   * { usuario, senha } e devolve { token }; ele ainda não existe em nenhuma API.
   */
  autenticacao: { ativa: false, loginUrl: '' },
};
