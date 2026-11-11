# Rotalog

## Visão Geral

Sistema de gestão de frotas e entregas. Gerencia veiculos, motoristas, entregas e notificação.
Composto por 3 apis de backend, 2 frontends (monorepo nx) e um repositório de infraestrutura.
Projeto legado com dívida técnica **intencional** (curso Alura). Ver `rotalog-workspace/CLAUDE_CONTEXT.md`
e `rotalog-workspace/MAPA_DIVIDAS_TECNICAS.md`.

## Regras gerais

- NÃO corrigir dívida técnica proativamente; só refatorar se o usuário pedir.
- Ao adicionar features, seguir o estilo/padrão do módulo em que se está mexendo.
- Cada pasta é um repositório git independente.
- Um único PostgreSQL 14 (db `rotalog`, user `rotalog_admin`; senha via `DB_PASSWORD` no `.env` do workspace, copie de `.env.example`) com 3 schemas: `frotas`, `entregas`, `notificacoes`.
- Dados de teste/seed novos: atualizar `rotalog-workspace/tools/scripts/`.
- Não ler/expor `.env` e senhas hardcoded.

## Mapa de serviços

| Serviço | Pasta | Stack | Porta |
|---|---|---|---|
| API Frotas | rotalog-api-frotas | Java 11 / Spring Boot 2.7 | 8080 (context-path `/api`) |
| API Entregas | rotalog-api-entregas | Node 18 / Express 4 | 3000 |
| API Notificações | rotalog-api-notificacoes | .NET 9 | 5000 |
| Painel Admin | rotalog-frontend/apps/painel-admin | Angular 18 | 4200 |
| Rastreamento | rotalog-frontend/apps/rastreamento | React 18 | 3001 |
| Infra | rotalog-workspace | Docker Compose + SQL | 5432 |

Integrações (HTTP síncrono, URLs hardcoded/fallback, sem retry/circuit breaker):
- entregas → frotas (`API_FROTAS_URL`, default `http://localhost:8080/api`) e → notificacoes (`API_NOTIFICACOES_URL`)
- frotas → entregas (`:3000`) e → notificacoes (`:5000`) via `EntregaClient` / `NotificacaoClient`
- notificacoes → não acessa mais os schemas de outros serviços (HealthController só checa o próprio banco; ADR 0001, fase 6)
- frontends → frotas (`:8080`) e entregas (`:3000`) via `fetch()`

## Repositórios

### rotalog-api-frotas (Java 11 / Spring Boot 2.7.14)

- Responsabilidade: veículos, motoristas, manutenções
- Banco: PostgreSQL, schema `frotas`
- Migration: Flyway (`db/migration`, V1 schema, V2 seed) — **desabilitado**; schema/seed vêm dos scripts do docker-compose
- Estrutura: controller -> service -> repository (pacote `com.rotalog`)
- Entidades JPA em `domain` (Veiculo, Motorista, Manutencao); DTOs de entrada em `dto` (`*Request`); Lombok
- `Veiculo` usa `TABLE_PER_CLASS` (dívida intencional); `ddl-auto=validate`
- Clients HTTP em `service`: `EntregaClient`, `NotificacaoClient` (RestTemplate, URL hardcoded)
- Rotas (`/api/...`): `/veiculos` (placa, status, quilometragem, desativar/reativar, estatisticas), `/motoristas` (cnh, status, cnh-vencida, desativar/reativar), `/manutencoes` (veiculo, pendentes, iniciar/concluir/cancelar), `/alertas-manutencao` (GET filtros `status`/`veiculoId`, `{id}`, POST `verificar` e `reprocessar`), `/health`
- Alerta de manutenção preventiva: tabela `frotas.alertas_manutencao`; critério `rotalog.manutencao.intervalo-km` (10000) / `intervalo-meses` (6) desde a última PREVENTIVA/REVISAO concluída; chama `POST /api/notificacoes/alerta-manutencao` (síncrono) e grava ENVIADO/FALHA; notificações fora do ar => PENDENTE (`reprocessar` reenvia). E2E: `rotalog-workspace/tools/e2e/alerta-manutencao.e2e.js`. Testes Java: `mvn test` (não há `mvnw` no repo)
- Rodar: `./mvnw spring-boot:run`; exige as variáveis `DB_USER` e `DB_PASSWORD` (sem valor padrão)

### rotalog-api-entregas (Node 18 / Express 4 / Sequelize)

- Responsabilidade: pedidos/entregas, rastreamento (e proxy de consultas à api-frotas)
- Banco: PostgreSQL, schema `entregas` (Sequelize `sync({alter:false})`; SQL em `src/config/*.sql`)
- Estrutura (refatorada pela ADR 0001, fases 1 a 5; ver `rotalog-api-entregas/docs/adr/`): `src/app.js` (monta o app) e `src/index.js` (sobe e encerra) ; `routes` (só path -> controller) -> `controllers` -> `services` (`EntregaService`, `RastreamentoService`, `frotasService`, `notificacaoService`, `httpClient`, `healthService`) ; `validators` (zod); `models`; `middleware` (auth, errorHandler, asyncHandler, carregarEntrega, validar); `constants/status.js`; `utils` (logger pino); `config/env.js` (única leitura de `process.env`) e `config/database.js`
- Estilo: JS CommonJS, `async/await` e `Promise`; logs só com `utils/logger` (`console.*` falha em `tests/unit/semConsole.test.js`); `http` nativo foi trocado pelo `httpClient` (fetch, timeout, retry só em GET). Os `FIXME` restantes apontam para a ADR ou o MAPA
- Auth: `middleware/auth.js` faz bypass fora de `NODE_ENV=production` e não valida JWT; `/api/rastreamento` sem auth. Só mudam na fase 6 da ADR (D4b), com aprovação e aviso aos frontends
- Rotas: `/api/entregas` (stats, `:id`, `pedido/:numero`, PUT, PATCH `status` e `atribuir`, DELETE), `/api/rastreamento` (`:entregaId`, `ultimo`, `pedido/:numeroPedido`, POST), `/api/frotas` (veiculos disponiveis/placa/disponibilidade, motoristas/:id), `/api/health`
- Testes: `npm test` (Jest + Supertest em `tests/unit`, `integration`, `contract`; testes de caracterização fixam o contrato) e `npm run test:coverage`; manual via `requests.http`
- Rodar: copiar `.env.example` para `.env` (`DB_USER` e `DB_PASSWORD` obrigatórios; sem banco a API não sobe) e `npm install && npm start` (`npm run dev` com nodemon)

### rotalog-api-notificacoes (.NET 9 / EF Core 9)

- Responsabilidade: notificações transacionais (email/SMS), templates, histórico
- Banco: PostgreSQL, schema `notificacoes` (`EnsureCreated`, sem migrations; SQL em `rotalog-workspace/tools/scripts/04` e `07`)
- Estrutura (ADR 0001, fase 5): `Controllers` (finos) -> `Services` (`NotificacaoService`, `TemplateRenderer`, `NotificacaoProcessor`, `NotificacaoEstatisticaService`, interfaces `I*`) ; `Canais` (`ICanalNotificacao`, envio fake); `Validators` (FluentValidation); `Middleware/GlobalExceptionHandler`; `Domain` (enum `StatusNotificacao`); `Data/Configurations` (Fluent API); `Models`; `DTOs`
- Clean Architecture abandonada (README cita Domain/Application/Infrastructure que **não existem**); MediatR removido (ADR 0001, fase 2)
- Namespace `api_notificacoes`; Swagger em `/swagger`; Canal como `string` (qualquer texto é aceito)
- Rotas: `/api/notificacoes` (GET filtros, `{id}`, POST, POST `alerta-manutencao` síncrono -> `{notificacaoId, status ENVIADO|FALHA, erro}` com destinatário `Notificacao:EmailGestor`, `{id}/reenviar`, `stats`, `templates`, `processar`), `/api/health`
- Config: `appsettings.json` NÃO é versionado (copiar de `appsettings.Example.json`; segredos por env var ou user-secrets); CORS `:4200`/`:3001`, rate limit, Swagger só em Development, banco fora derruba a subida; validação FluentValidation (canal email/sms), HTML-encode no template de email, logs Serilog com destinatário mascarado
- Rodar: `dotnet restore && dotnet run`
- Testes: `dotnet test tests/api-notificacoes.Tests` (xUnit, caracterização e contrato, database `rotalog_test`; use `-c Release` se a API estiver rodando). ADR 0001 em `docs/adr/`, fases 1 a 6 feitas + D4 envio assíncrono (fila em memória; POST responde 201 PENDENTE e o envio roda em `EnvioEmBackground`) (.NET 9; o 10 LTS ficou pendente por falta do SDK)

### rotalog-frontend (monorepo Nx 19, npm)

- `apps/painel-admin`: Angular 18 standalone, rotas sem lazy loading (dashboard, veiculos, motoristas, manutencoes, entregas). Componentes grandes com template inline (veiculos ~460 linhas); services usam `fetch()` com `async/await` em vez de `HttpClient`, URL hardcoded, cache manual; models em `app/models/index.ts`
- `apps/painel-admin-e2e`: Playwright (apenas exemplo)
- `apps/rastreamento`: React 18 + Leaflet, `fetch` direto para `localhost:3000`, componentes em `src/components` (DeliveryList, MapView, TrackingDashboard)
- `libs/`: `shared-types`, `ui-components` (DataTable, StatusBadge), `api-contracts` (openapi.yaml)
- Sempre usar `npx nx ...` (serve, build, test, lint); ver `rotalog-frontend/CLAUDE.md` para diretrizes Nx
- Rodar: `npx nx run-many --target=serve --projects=painel-admin,rastreamento`

### rotalog-workspace (infra)

- `docker-compose.yml`: só o Postgres; init scripts em `tools/scripts/` na ordem `init-schemas` -> `02..04` migrations -> `05..07` seeds -> `08`
- Redis/Kafka/etc. comentados, nunca implementados
- Subir: `docker-compose up -d postgres`; resetar: `docker-compose down -v`
- Ordem para rodar tudo: banco -> apis -> frontends
