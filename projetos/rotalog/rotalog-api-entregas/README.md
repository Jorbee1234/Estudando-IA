# RotaLog API Entregas

Microsserviço de gestão de entregas: pedidos e rastreamento, mais um proxy de consultas à api-frotas.

## Stack

- Node.js 18 (`.nvmrc`)
- Express 4.x
- Sequelize ORM
- PostgreSQL (schema `entregas`)
- pino (logs)

## Como rodar

Pré-requisito: PostgreSQL rodando via `rotalog-workspace` (`docker-compose up -d postgres`).

```bash
cp .env.example .env   # preencha as credenciais
npm install
npm start              # ou: npm run dev
```

A API sobe na porta **3000**. O nível de log vem de `LOG_LEVEL` (padrão `info`; `debug` mostra o SQL).

- `DB_USER` e `DB_PASSWORD` são obrigatórios; sem eles, ou com o banco fora do ar, a API não sobe.
- CORS: só as origens de `CORS_ORIGINS` (padrão `http://localhost:4200` e `http://localhost:3001`).
- `SIGTERM` e `SIGINT` encerram o servidor e o pool de conexões antes de sair.
- Todas as variáveis estão em `.env.example`.

## Estrutura do projeto

```
src/
├── app.js           # monta o app Express (sem listen)
├── index.js         # sobe o servidor
├── routes/          # só mapeia path -> controller
├── controllers/     # HTTP: lê a requisição, chama o service, responde
├── services/        # EntregaService, RastreamentoService, frotasService, notificacaoService, httpClient
├── models/          # models do Sequelize
├── validators/      # schemas zod de entrada (params, query e body)
├── middleware/      # auth, errorHandler, asyncHandler, carregarEntrega, validar
├── constants/       # lista única de status
├── utils/           # logger
└── config/          # env.js (única leitura de variáveis), banco e SQL
tests/               # unit, integration e contract (Jest + Supertest)
docs/adr/            # decisões e plano de refatoração
```

## Endpoints

| Método | Rota                                         | Descrição                          |
|--------|----------------------------------------------|------------------------------------|
| GET    | /api/health                                  | Health check (banco, api-frotas e api-notificacoes; 503 se o banco cair) |
| GET    | /api/entregas                                | Listar (filtros `veiculo`, `status`, `motorista_id`) |
| GET    | /api/entregas/stats                          | Totais por status                  |
| GET    | /api/entregas/:id                            | Buscar por ID                      |
| GET    | /api/entregas/pedido/:numeroPedido           | Buscar por número do pedido        |
| POST   | /api/entregas                                | Criar                              |
| PUT    | /api/entregas/:id                            | Atualizar                          |
| PATCH  | /api/entregas/:id/status                     | Alterar status                     |
| PATCH  | /api/entregas/:id/atribuir                   | Atribuir veículo e motorista       |
| DELETE | /api/entregas/:id                            | Cancelar                           |
| GET    | /api/rastreamento/:entregaId                 | Eventos (404 se não houver)        |
| GET    | /api/rastreamento/:entregaId/ultimo          | Último evento                      |
| GET    | /api/rastreamento/pedido/:numeroPedido       | Rastreamento por pedido            |
| POST   | /api/rastreamento/:entregaId                 | Registrar evento                   |
| GET    | /api/frotas/veiculos/disponiveis             | Veículos ativos (api-frotas)       |
| GET    | /api/frotas/veiculos/:placa                  | Veículo por placa                  |
| GET    | /api/frotas/veiculos/:placa/disponibilidade  | Disponibilidade do veículo         |
| GET    | /api/frotas/motoristas/:id                   | Motorista por ID                   |

## Testes

```bash
npm test
npm run test:coverage
```

Os testes de caracterização fixam o comportamento atual, inclusive o que é dívida técnica conhecida.
Para teste manual, use o `requests.http`.

## Refatoração

O plano está em [docs/adr/0001-reorganizacao-e-seguranca-api-entregas.md](docs/adr/0001-reorganizacao-e-seguranca-api-entregas.md).
