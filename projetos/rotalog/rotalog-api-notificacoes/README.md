# RotaLog API Notificações

Microsserviço de notificações transacionais (e-mail e SMS), templates e histórico.

> O envio é **simulado**: nada é enviado de verdade e há falha aleatória (10% e-mail, 20% SMS).
>
> O envio acontece **depois** da resposta, em segundo plano (fila em memória + `BackgroundService`). `POST /api/notificacoes` e `POST /{id}/reenviar` respondem na hora com a notificação `PENDENTE`; o resultado (`ENVIADO`, ou `PENDENTE` com `erroMensagem`, ou `FALHA`) aparece em `GET /api/notificacoes/{id}`. Retentativas continuam em `POST /api/notificacoes/processar`.
> Problemas conhecidos e o plano de refatoração: [ADR 0001](docs/adr/0001-reorganizacao-e-seguranca-api-notificacoes.md).

## Stack

- .NET 9 / ASP.NET Core, Entity Framework Core 9 (SDK fixado em `global.json`)
- PostgreSQL 14, schema `notificacoes`
- Swagger em `/swagger`

## Como rodar

Pré-requisito: PostgreSQL via `rotalog-workspace` (`docker-compose up -d postgres`).

```bash
dotnet restore
dotnet run
```

A API sobe na porta **5000** e **não sobe sem o banco** (falha na inicialização).

### Configuração e segredos

`appsettings.json` e `appsettings.*.json` não são versionados. Copie `appsettings.Example.json` para `appsettings.json` e preencha, ou use variáveis de ambiente / *user-secrets*:

```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;...;Password=<senha>;SearchPath=notificacoes"
dotnet user-secrets set "EmailSettings:SenderPassword" "<senha>"
# ou: ConnectionStrings__DefaultConnection, EmailSettings__SenderPassword, SmsSettings__ApiKey
```

Outras chaves: `Cors:Origens` (padrão `:4200` e `:3001`), `RateLimit:Limite` e `RateLimit:JanelaSegundos` (60 por 60 s, por IP, nos POSTs de criar e reenviar), `Notificacao:TamanhoLote` (50), `Envio:Capacidade` (1000) e `Envio:RecuperarPendentesNaInicializacao` (true: reenfileira pendentes sem tentativa ao subir), `AllowedHosts`, nível de log em `Serilog:MinimumLevel`.

### Em produção

Swagger fica desligado; HTTPS redirect e HSTS ligados; logs em JSON compacto; corpo de requisição limitado a 1 MB.

## Banco de dados

O schema e o seed vêm dos scripts do workspace, que são a única fonte:

- `rotalog-workspace/tools/scripts/04-migration-notificacoes.sql`
- `rotalog-workspace/tools/scripts/07-seed-notificacoes.sql`

## Estrutura

```
├── Controllers/      # NotificacoesController (fino), HealthController
├── Services/         # NotificacaoService (criar/consultar/reenviar), TemplateRenderer,
│                     # NotificacaoProcessor (envio, retry, lote), NotificacaoEstatisticaService
├── Canais/           # ICanalNotificacao, EmailCanal, SmsCanal, IFalhaSimulada (envio simulado)
├── Envio/            # FilaEnvio (Channel) e EnvioEmBackground (worker)
├── Validators/       # NotificacaoRequestValidator, ReenvioRequestValidator (FluentValidation)
├── Mapping/          # NotificacaoMapper
├── Middleware/       # GlobalExceptionHandler (erros 500)
├── Domain/           # StatusNotificacao (enum), CanalNotificacao (constantes)
├── Configuration/    # Email, Sms, Notificacao, Cors e RateLimit (Options)
├── Logging/          # Mascara (destinatário nos logs)
├── Data/              # NotificacoesDbContext, Configurations/ (Fluent API)
├── Models/ DTOs/
├── tests/            # api-notificacoes.Tests (caracterização, contrato, unitários, integração)
└── Program.cs
```

## Endpoints

| Método | Rota                                | Descrição                                          |
|--------|-------------------------------------|----------------------------------------------------|
| GET    | /api/notificacoes                   | Lista (filtros `tipo`, `status`, `canal`, `servicoOrigem`) |
| GET    | /api/notificacoes/{id}              | Busca por id                                       |
| POST   | /api/notificacoes                   | Cria e tenta enviar (`201`)                        |
| POST   | /api/notificacoes/{id}/reenviar     | Reenvia                                            |
| GET    | /api/notificacoes/stats             | Estatísticas                                       |
| GET    | /api/notificacoes/templates         | Templates (`apenasAtivos=true`)                    |
| POST   | /api/notificacoes/processar         | Processa pendentes (lote de 50)                    |
| GET    | /api/health                        | Health check do próprio banco                      |

Exemplos prontos em [requests.http](requests.http).

## Testes

Usam o PostgreSQL do docker-compose, em um database separado (`rotalog_test`), criado automaticamente.

```bash
dotnet test tests/api-notificacoes.Tests
```

Se a API estiver rodando e travar os binários, use `-c Release`.
