# ADR 0001 — Reorganização, segurança e testes da `rotalog-api-entregas`

- **Status:** Proposto
- **Data:** 2026-11-08
- **Escopo:** `rotalog-api-entregas` — [src/](../../src/)
- **Base:** [MAPA_DIVIDAS_TECNICAS.md](../../../rotalog-workspace/MAPA_DIVIDAS_TECNICAS.md) §1.1 a §1.8, §4.2, §5.2, T2, T3, T4, T6 e T7

## Contexto

A api-entregas tem 1301 linhas de JavaScript em `src/` e concentra, nas rotas, validação, regra de negócio, persistência e resposta HTTP. Por ser dívida técnica intencional do projeto, nada foi alterado até agora. Esta ADR registra os problemas encontrados e a direção da refatoração. **Ela não altera código.**

Os temas tratados são: organização do projeto, segurança, distribuição de responsabilidades entre serviços e integrações, `console.log`, comentários em excesso e testes.

> **Sobre os comentários e o estilo local.** O `CLAUDE.md` do projeto manda não corrigir dívida técnica proativamente e seguir o estilo do arquivo (incluindo `FIXME`/`TODO` em português). A limpeza de comentários e logs proposta aqui só vale porque foi pedida explicitamente, e deve ser feita na fase indicada, não de passagem em outras mudanças.

## Problemas identificados

### 1. Lógica de negócio dentro das rotas
[routes/entregas.js](../../src/routes/entregas.js) (365 linhas) mistura validação, cálculo, transição de status, persistência e criação de evento de rastreamento. Não existe camada de serviço para o domínio de entregas, só para integrações.

Repetições medidas por busca:
| Padrão | Ocorrências |
|---|---|
| `404 "Entrega não encontrada"` | 5 em `entregas.js` (linhas 107, 209, 241, 293, 341) |
| `entrega.data_atualizacao = new Date()` | 4 em `entregas.js` (219, 253, 309, 346) |
| `Rastreamento.create` logo após alterar a entrega | 4 em `entregas.js` (185, 265, 314, 349) |
| `try/catch` + `500` em cada handler | em todas as rotas |
| `http.get` + acumular `data` + `JSON.parse` + tratar 200/404/erro | 3 em [frotasService.js](../../src/services/frotasService.js) (26, 62, 117) |
| Listagem de eventos `Rastreamento.findAll` ordenada | 2 em [rastreamento.js](../../src/routes/rastreamento.js) (18, 104) |

Também não há transação entre salvar a entrega e criar o evento: uma falha no meio deixa a entrega alterada sem histórico. `PATCH /:id/status` aceita qualquer transição (o MAPA §1.1 registra o caso `ENTREGUE` → `PENDENTE`), e a lista de status válidos está escrita à mão na rota, no model e no SQL.

### 2. Segurança
| Ponto | Situação |
|---|---|
| Autenticação | [auth.js:16](../../src/middleware/auth.js#L16) libera a requisição quando `NODE_ENV !== 'production'`, o que inclui o valor vazio. Em produção, [auth.js:36](../../src/middleware/auth.js#L36) só exige um Bearer com 10 ou mais caracteres e cria um admin fixo. O `JWT_SECRET` ([auth.js:12](../../src/middleware/auth.js#L12)) nunca verifica assinatura nem expiração, e `jsonwebtoken` não está nas dependências. |
| Rotas sem auth | `/api/rastreamento` (inclusive o `POST`, que grava eventos e posições) e `/api/health`. Montagem em [index.js:75-77](../../src/index.js#L75-L77): só `/api/entregas` e `/api/frotas` passam pelo middleware. |
| CORS | Cabeçalhos escritos à mão com `*` ([index.js:35](../../src/index.js#L35)). O pacote `cors` está no `package.json` e não é usado. |
| Vazamento de informação | O `errorHandler` devolve `err.stack` fora de produção ([errorHandler.js:20](../../src/middleware/errorHandler.js#L20)) e loga `req.body` e a stack ([errorHandler.js:12](../../src/middleware/errorHandler.js#L12), [:14](../../src/middleware/errorHandler.js#L14)). `detalhes: error.message` é devolvido em [entregas.js:198](../../src/routes/entregas.js#L198) e [frotas.js:27](../../src/routes/frotas.js#L27). |
| Validação de entrada | Quase inexistente. Não há checagem de tipo de lat/lng, `peso_kg` nem `evento` (texto livre). Coordenada `0` é tratada como ausente. `:id` vai direto ao `findByPk`. `req.query.status.toUpperCase()` ([entregas.js:33](../../src/routes/entregas.js#L33)) falha se `status` vier repetido na query (array) e vira `500`. |
| Chamada ao api-frotas | `placa` e `id` são concatenados na URL sem `encodeURIComponent` ([frotasService.js:23](../../src/services/frotasService.js#L23), [:59](../../src/services/frotasService.js#L59)). |
| Proteções ausentes | Sem `helmet`, sem rate limit e sem limite explícito de body (`express.json()` puro, [index.js:44](../../src/index.js#L44)). |
| Segredos | O `.env` é versionado (o `.gitignore` o deixa comentado de propósito) e `database.js` e `auth.js` têm valores de fallback hardcoded. Esta ADR não reproduz os valores. Eles devem ser considerados comprometidos (MAPA T3). |
| Dependências | `package-lock.json` está no `.gitignore`, `engines` não é declarado e não há `.nvmrc`. |

Não foi encontrada SQL injection: a query raw de `/stats` é estática e o resto usa o ORM.

### 3. Integrações e distribuição de responsabilidades
- [frotasService.js](../../src/services/frotasService.js) e [notificacaoService.js](../../src/services/notificacaoService.js) usam o módulo `http` nativo, em estilo callback, **sem timeout, retry nem suporte a `https`**. Uma api-frotas lenta deixa a requisição pendurada (MAPA T4).
- **`notificacaoService.js` (135 linhas) não é importado por nenhum arquivo.** Nenhuma notificação sai da api-entregas, e `API_NOTIFICACOES_URL` nunca é lida na prática (MAPA §1.1).
- As URLs são lidas na importação do módulo, e `dotenv.config()` é chamado em dois lugares ([index.js:18](../../src/index.js#L18) e [database.js:13](../../src/config/database.js#L13)). As variáveis de ambiente estão espalhadas por 6 arquivos, com credenciais de fallback.
- [routes/frotas.js](../../src/routes/frotas.js) é um proxy improvisado, com 4 handlers quase idênticos e sem cache ou timeout.
- `/api/health` devolve `UNKNOWN` fixo para banco e serviços ([index.js:67-69](../../src/index.js#L67-L69)) e uma versão fixa.
- `testConnection()` engole o erro e a API sobe sem banco ([index.js:87](../../src/index.js#L87)). Não há graceful shutdown: `uncaughtException` chama `process.exit(1)` sem fechar o pool ([index.js:143](../../src/index.js#L143)).
- Existem 3 fontes de verdade para o schema (SQL em `src/config`, `sequelize.sync` e os scripts do workspace). Isso é tratado no MAPA §5.2 e está **fora do escopo** desta ADR.

### 4. `console.log` em excesso
Há **73 chamadas `console.*` em 9 arquivos**:
| Arquivo | Qtd |
|---|---|
| `src/index.js` | 31 |
| `src/routes/entregas.js` | 12 |
| `src/services/notificacaoService.js` | 8 |
| `src/middleware/errorHandler.js` | 6 |
| `src/routes/rastreamento.js` | 5 |
| `src/services/frotasService.js` | 5 |
| `src/config/database.js` | 3 |
| `src/middleware/auth.js` | 2 |
| `src/routes/frotas.js` | 1 |

Não são só ruído, parte vaza informação ou polui a saída:
- `req.body` completo e a stack no `errorHandler`;
- `logging: console.log` no Sequelize ([database.js:27](../../src/config/database.js#L27)), que imprime todo SQL com parâmetros;
- uma linha por requisição com método e URL (inclui query string);
- o aviso do bypass de autenticação a cada requisição;
- host e porta do banco e as URLs completas do api-frotas;
- cerca de 26 linhas de banner com a lista de endpoints no `startServer`, que ficam desatualizadas quando as rotas mudam.

Não há níveis, correlação nem formato estruturado (MAPA T6).

### 5. Comentários em excesso
O `src/` tem **149 marcadores `FIXME`/`TODO`**, e a proporção de linhas de comentário passa de 30% em vários arquivos (estimativa por leitura, não medida por ferramenta):

| Arquivo | `FIXME`/`TODO` | Comentários (aprox.) |
|---|---|---|
| `routes/entregas.js` | 37 | ~22% |
| `middleware/auth.js` | 15 | ~37% |
| `config/database.js` | 14 | ~33% |
| `services/frotasService.js` | 12 | ~22% |
| `services/notificacaoService.js` | 12 | ~24% |
| `models/index.js` | 3 | ~47% |

Padrões a remover:
- JSDoc que só repete a rota ou o nome da função (`GET /api/entregas/:id - Buscar entrega por ID`; "Notificar criação de entrega" sobre `notificarEntregaCriada`);
- cabeçalhos de arquivo que são só uma lista de `FIXME`;
- comentários óbvios (`// Load environment variables`, `// Database`, `// Routes`);
- `FIXME` repetido sobre o mesmo assunto no mesmo arquivo (por exemplo, "usar logger");
- `FIXME` que apenas duplicam o MAPA de dívidas.

### 6. Sem testes e sem ferramentas de qualidade
`npm test` é o placeholder `echo "Error: no test specified" && exit 1`. Não há teste, lint, formatação, Dockerfile nem CI. Toda a validação de comportamento é manual via [requests.http](../../requests.http). `src/index.js` cria o app e chama `listen` no mesmo arquivo, o que impede importar o app em um teste.

### 7. Documentação desatualizada
O [README.md](../../README.md) descreve uma estrutura (`middlewares/`, lógica de negócio em `services/`) que não bate com o código, e lista rotas que não existem (`GET /api/entregas/:id/tracking` e `GET /api/rotas`). Deve ser atualizado junto da fase de reorganização.

### 8. Contratos que a refatoração precisa preservar
O painel-admin, o portal de rastreamento e a api-frotas consomem esta API. Qualquer mudança abaixo exige aviso e verificação:
| Contrato | Observação |
|---|---|
| Formato de erro `{ "error": "..." }` | Variações em uso: `detalhes`, `statusValidos` (PATCH status) e `path`/`method` (404 de rota). |
| `GET /api/rastreamento/:entregaId` | Responde **404** (não `[]`) quando não há eventos ([rastreamento.js:24](../../src/routes/rastreamento.js#L24)). |
| Autenticação | Ativar validação real derruba clientes sem token em `/entregas` e `/frotas`. Exigir auth em `/rastreamento` quebra o portal público. |
| Campos | Nomes em snake_case, datas ISO, decimais como string. |
| `GET /api/entregas` | Array puro, sem paginação. A query `veiculo` é usada pela api-frotas (Java). |
| Chamadas ao api-frotas | `/veiculos/placa/{placa}`, `/motoristas/{id}` e `/veiculos/status/ATIVO`. |

## Decisão

Refatorar em fases, **mantendo o comportamento externo**, exceto onde indicado como mudança de contrato.

### D1. Reorganizar em camadas
Estrutura alvo, sem mudar nenhuma rota:

```
src/
├── app.js                  # monta o app (sem listen), exporta para testes
├── index.js                # só sobe o servidor e o shutdown
├── config/                 # env.js (única leitura de variáveis), database.js
├── routes/                 # só mapeia path -> controller
├── controllers/            # HTTP: lê req, chama service, responde
├── services/               # EntregaService, RastreamentoService, frotasService, notificacaoService
├── validators/             # schemas de entrada
├── middleware/             # auth, errorHandler, asyncHandler, carregarEntrega
├── constants/status.js     # lista única de status
├── utils/logger.js
└── models/
```

Extrações que removem as repetições do problema 1:
| Extrair | Substitui |
|---|---|
| `asyncHandler` + `errorHandler` global | Os `try/catch` + `500` de cada handler |
| Middleware `carregarEntrega` | `findByPk` + `404` (5×) |
| `EntregaService.registrarEvento(entrega, evento, descricao)` | `data_atualizacao` + `save` + `Rastreamento.create` + log (4×), agora **dentro de uma transação Sequelize** |
| `Rastreamento.porEntrega(id)` (método estático do model) | `findAll` ordenado (2×) |
| `proxyFrotas(fn)` | Os 4 handlers do proxy com `502` |
| `constants/status.js` | Lista de status escrita à mão na rota, no model e no SQL |

A máquina de estados (impedir `ENTREGUE` → `PENDENTE`) **não entra aqui**: muda comportamento e fica na fase 6.

### D2. Configuração central e cliente HTTP único
- `config/env.js` é o único lugar que chama `dotenv` e lê `process.env`. Valida as variáveis obrigatórias na subida e **não tem credencial de fallback**.
- `services/httpClient.js` usa o `fetch` nativo do Node 18 com `AbortController` (timeout configurável), `encodeURIComponent` nos parâmetros de path, suporte a `https` e retry simples (somente `GET`). Substitui os 3 blocos `http.get` e o `http.request`.
- `frotasService` e `notificacaoService` passam a usar o `httpClient` e a devolver `Promise`, não callbacks.

### D3. Notificações: ligar ou remover
O `notificacaoService` é código morto. A decisão é explícita, em fase própria:
- **Recomendado:** ligar nos fluxos de criação, mudança de status e conclusão, atrás da flag `ENABLE_NOTIFICATIONS` (que existe no `.env` e ninguém lê). Uma falha de notificação **nunca** derruba a requisição. Isso muda comportamento (passam a sair e-mails), então exige aprovação.
- **Alternativa:** remover o arquivo. Até a decisão, ele permanece como está.

### D4. Segurança em duas camadas
**D4a. Sem mudança de contrato (fase 5):**
- `helmet`; `cors` (o pacote já instalado) com origens vindas de configuração, com padrão para os dois frontends locais; `express.json({ limit })`.
- `errorHandler` sem `stack` na resposta e sem `req.body` no log; remover `detalhes: error.message` das respostas (a mensagem vai para o log do servidor). O campo `error` é mantido.
- Validação de entrada com `zod` (ou `joi`): `:id` numérico, `status` como string, lat/lng no intervalo, `peso_kg` numérico positivo, tamanho máximo de `evento` e `descricao`. Coordenada `0` passa a ser aceita. Respostas de validação continuam em `400` com `{ error }`.
- `.env.example`; `.env` no `.gitignore` e fora do versionamento; remoção dos fallbacks de credencial; `package-lock.json` versionado; `engines` e `.nvmrc`; **rotação das senhas atuais** (MAPA T3).

**D4b. Muda contrato (fase 6, cada item aprovado e comunicado):**
- JWT real (`jsonwebtoken`, assinatura e expiração) no lugar do bypass. O desenvolvimento local passa a usar um token de teste ou uma flag explícita, e não mais a ausência de `NODE_ENV`.
- Autenticação ou assinatura de origem no `POST /api/rastreamento/:id`, mantendo as leituras públicas.
- Rate limit nas rotas públicas de consulta por pedido.

> ⚠️ **Muda o contrato.** Os frontends e a api-frotas consomem esta API. Avisar antes do merge, alinhar com o painel-admin e o rastreamento e verificar a integração.

### D5. Logger estruturado
- `utils/logger.js` com `pino`, nível controlado por `LOG_LEVEL`. Substitui as 73 chamadas `console.*`.
- Log de requisição (`pino-http`) sem body e sem query string sensível. O aviso de bypass deixa de ser logado a cada requisição.
- `logging` do Sequelize só em nível `debug`.
- O banner de endpoints do `startServer` é removido. Fica uma linha com porta e ambiente.
- Regra de lint (`no-console`) impede a volta do `console.*`.

### D6. Comentários
- Remover o JSDoc que repete o nome, os cabeçalhos só de `FIXME` e os comentários óbvios listados no problema 5.
- Manter comentário apenas onde há regra não óbvia (por exemplo, por que a rota `/rastreamento/:id` responde `404` sem eventos).
- `FIXME`/`TODO` resolvidos por esta ADR são removidos. Os que permanecem apontam para esta ADR ou para uma seção do MAPA, em vez de repetir a explicação.
- Feito em um PR próprio e sem mudança de lógica, para facilitar a revisão.

### D7. Health real e encerramento limpo
- `/api/health` consulta o banco (`sequelize.authenticate()`) e, com timeout curto, a api-frotas e a api-notificacoes. Devolve `UP`/`DOWN` por dependência e a versão do `package.json`. Mantém o formato atual do corpo.
- `SIGTERM`/`SIGINT` e `uncaughtException` fecham o servidor e o pool antes de sair. `testConnection()` passa a falhar a subida quando o banco está fora (comportamento a confirmar, porque hoje a API sobe sem banco).

### D8. Estratégia de testes
Hoje a cobertura é zero. Esta é a base das demais decisões: **nenhuma fase de refatoração entra sem os testes da fase anterior verdes**.

**Ferramentas**
- Jest + Supertest. Mocks de `models` e do `httpClient` com `jest.mock`; `nock` (ou mock do `fetch`) para as integrações.
- Scripts: `npm test`, `npm run test:watch` e `npm run test:coverage`, substituindo o placeholder que falha.
- `app.js` separado de `index.js` (exporta o app sem `listen`).
- Pastas: `tests/unit`, `tests/integration`, `tests/contract`.
- SQLite não serve como banco de teste: o schema `entregas` e os tipos são do PostgreSQL.

**Camadas**
| Camada | O que cobre |
|---|---|
| Caracterização | Comportamento **atual**, escrito antes de refatorar, inclusive o "errado" que precisa ser preservado: `404` em `GET /rastreamento/:id` sem eventos, `DELETE` que cancela uma entrega já entregue, transição livre de status, bypass de auth fora de produção. |
| Unitários | Services, helpers, validators, `httpClient`, `logger`. |
| Integração HTTP | Supertest sobre o `app`, com models mockados. |
| Integração com PostgreSQL | Opcional, em suíte separada, com o banco do `docker-compose up -d postgres` (schema `entregas`). |
| Contrato | Respostas esperadas do api-frotas (`/veiculos/placa/{placa}`, `/motoristas/{id}`, `/veiculos/status/ATIVO`), payload enviado ao api-notificacoes e *snapshot* do formato de erro `{ error }`, para proteger os consumidores. |

**Casos mínimos**
- **POST /entregas:** sucesso; sem origem ou destino; coordenada `0`; peso inválido; geração de `numero_pedido`.
- **GET /entregas:** filtros `veiculo`, `status`, `motorista_id`; `status` repetido na query (array).
- **GET /entregas/:id e /pedido/:numero:** encontrado, `404`, id não numérico.
- **PUT /entregas/:id:** sucesso e `404`.
- **PATCH status:** válido; inválido (devolve `statusValidos`); `ENTREGUE` → `PENDENTE` como caracterização.
- **PATCH atribuir:** sucesso; campos faltando; falha do api-frotas.
- **DELETE:** cancela; `404`.
- **GET /stats:** totais por status.
- **Rastreamento:** lista; `404` sem eventos; `ultimo`; por pedido; `POST` com e sem lat/lng inválidos.
- **Proxy de frotas:** `200`, `404` e `502`; sem `detalhes` vazando após a D4a.
- **Auth:** sem token, mal formado e válido; bypass fora de produção (caracterização); JWT real na fase 6.
- **errorHandler:** sem `stack` na resposta e sem `req.body` no log; JSON malformado; `404` de rota.
- **httpClient:** timeout, `404`, JSON inválido, retry só em `GET`, `encodeURIComponent`.
- **Transação:** falha no `Rastreamento.create` desfaz o `save` da entrega.
- **Logger:** teste ou regra de lint que falha se `console.*` voltar ao `src/`.
- **Health:** banco fora de ar devolve `DOWN`.

**Meta e qualidade**
- Cobertura sugerida ≥ 80% de linhas em services, controllers, validators e `httpClient`, com `coverageThreshold` no Jest para não regredir.
- ESLint + Prettier com configuração mínima e um workflow de CI (`npm ci && npm run lint && npm test`) como item opcional da fase 2.
- O `requests.http` continua como roteiro manual e é usado na verificação cruzada com os frontends.
- A pasta `tests/` e as `devDependencies` só serão criadas quando esta ADR for implementada.

## Alternativas consideradas

| Alternativa | Motivo da rejeição / adiamento |
|---|---|
| Só limpar logs e comentários | Não reduz as responsabilidades das rotas nem resolve segurança e testes. Vira a **fase 2** deste plano, não a solução completa. |
| Migrar para TypeScript ou NestJS | Escopo muito maior, mistura reescrita com refatoração. **Adiado**. |
| BFF / API Gateway no lugar do proxy de frotas | Resolve o acoplamento, mas é decisão de arquitetura entre serviços. O `proxyFrotas` isola o ponto para essa troca. **Adiado**. |
| Redis, cache e circuit breaker | Fora do escopo agora. O `httpClient` único já centraliza o ponto onde entrariam. **Adiado**. |
| `axios`/`got` em vez de `fetch` nativo | Desnecessário no Node 18. Reavaliar na ADR de atualização de runtime (MAPA §1.4). |
| Ligar JWT real já na primeira fase | Derruba clientes sem token e o portal público. Fica na **fase 6**, com aviso aos consumidores. |
| `winston` em vez de `pino` | Equivalente para este caso. `pino` é mais leve e tem `pino-http`. Escolha reversível por estar atrás de `utils/logger.js`. |

## Consequências

**Positivas**
- Rotas finas, regra de negócio testável e com uma razão para mudar.
- Menos código repetido (`try/catch`, `404`, evento de rastreamento, cliente HTTP).
- Integrações com timeout, e uma api-frotas lenta deixa de travar a requisição.
- Superfície de ataque menor (sem `stack`, sem `detalhes`, sem segredos versionados) e caminho claro para autenticação real.
- Logs com nível, sem dados sensíveis e sem ruído.
- Cobertura de teste onde hoje há zero, protegendo os contratos dos consumidores.

**Negativas / riscos**
- Mais arquivos e pastas no módulo.
- A fase 6 muda contrato e exige coordenação com painel-admin, rastreamento e api-frotas.
- Ligar as notificações (D3) faz sair e-mail onde hoje não sai nada.
- Falhar a subida sem banco (D7) pode surpreender quem roda a API sem o Postgres.
- Remover comentários apaga contexto histórico do curso. O MAPA e esta ADR passam a ser o registro.

**Não muda**
- Rotas, métodos, nomes de campos e formato de resposta, exceto os itens da D4b e da D3.
- Express 4, Sequelize 6 e Node 18: a atualização de runtimes é outra ADR (MAPA §1.4).
- A duplicação das fontes de verdade do schema e o `sequelize.sync` (MAPA §5.2, domínio do `rotalog-workspace`).
- A decisão de manter o `.env` versionado **só vale até a rotação de segredos**; depois dela ele sai do controle de versão.

## Plano de implementação

Cada fase deve ser um PR/commit independente.

1. **Infra de testes e caracterização:** Jest/Supertest, `app.js` separado de `index.js`, scripts, cobertura, testes de caracterização e de contrato.
2. **Limpeza:** logger (D5), comentários (D6), decisão sobre o código morto (D3, caminho "remover" ou "manter até a fase 6"), `.gitignore`, `.env.example`, `engines`, lockfile, README atualizado. Opcional: ESLint, Prettier e CI.
3. **Configuração central e `httpClient`** com timeout (D2).
4. **Extração em camadas e helpers**, com transação (D1).
5. **Segurança sem mudança de contrato** (D4a), health real e encerramento limpo (D7), rotação de segredos.
6. **Mudanças que alteram contrato**, cada uma aprovada e comunicada: JWT real e auth no `POST /rastreamento` (D4b), ligação das notificações (D3), máquina de estados, `404` vs `[]`, paginação, normalização de campos.

## Verificação (quando for implementar)
- `npm install && npm run test:coverage` com as suítes unit, integration e contract verdes e a meta de cobertura atingida.
- Subir a API com o Postgres (`docker-compose up -d postgres` em `rotalog-workspace`) e exercitar todas as rotas do `requests.http`, comparando as respostas antes e depois de cada fase.
- Conferir que o painel-admin (`:4200`) e o rastreamento (`:3001`) continuam funcionando, e que a api-frotas ainda consulta `GET /api/entregas?veiculo=`.
- `grep -rn "console\." src` sem resultados.
- Provocar um erro `500` e confirmar que a resposta não traz `stack` nem `detalhes`.
- Derrubar a api-frotas e confirmar que as rotas de proxy respondem `502` dentro do timeout configurado.
