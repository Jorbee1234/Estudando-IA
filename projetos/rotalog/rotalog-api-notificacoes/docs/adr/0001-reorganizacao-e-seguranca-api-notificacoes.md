# ADR 0001 — Reorganização, segurança, testes e atualização de runtime da `rotalog-api-notificacoes`

- **Status:** Proposto
- **Data:** 2026-11-08
- **Escopo:** `rotalog-api-notificacoes` — [Services/](../../Services/), [Controllers/](../../Controllers/), [Program.cs](../../Program.cs), [Data/](../../Data/)
- **Base:** [MAPA_DIVIDAS_TECNICAS.md](../../../rotalog-workspace/MAPA_DIVIDAS_TECNICAS.md) §3.1 a §3.8, §5.2, §5.3, T1 a T7

## Contexto

A api-notificacoes tem 1072 linhas de C# (sem `bin/` e `obj/`) e concentra, em um único serviço de 369 linhas, CRUD, template, envio, retry e estatística. Roda em .NET 6 / EF Core 6, sem autenticação e sem testes. Por ser dívida técnica intencional do projeto, nada foi alterado até agora. Esta ADR registra os problemas encontrados e a direção da refatoração. **Ela não altera código.**

Os temas tratados são: divisão dos serviços longos, organização do SQL, segurança, testes, logs e comentários, e atualização do .NET.

> **Sobre o estilo local.** O `CLAUDE.md` do projeto manda não corrigir dívida técnica proativamente. Tudo o que está aqui só vale porque a refatoração foi pedida, e deve ser feito na fase indicada, não de passagem em outras mudanças.

> **Medições.** Os números abaixo vêm de contagem por busca no código (`grep`/`wc`), sem rodar build nem testes. Contagens de `FIXME`/`TODO` são de **linhas** que contêm o marcador.

## Problemas identificados

### 1. God class e responsabilidades misturadas
[NotificacaoService.cs](../../Services/NotificacaoService.cs) (369 linhas) é uma classe concreta, sem interface, registrada direto em [Program.cs:41](../../Program.cs#L41). Ela faz:

| Responsabilidade | Onde |
|---|---|
| Consulta e filtros | `ListarNotificacoes`, `BuscarPorId` |
| Validação | `CriarNotificacao` (linhas 82-85) |
| Resolução de template | `CriarNotificacao` (91-104) e `AplicarTemplate` (336) |
| Persistência e ciclo de vida | `CriarNotificacao`, `ReenviarNotificacao` |
| Envio por canal | `EnviarEmail` (280) e `EnviarSms` (312), ambos fake |
| Retry e lote | `TentarEnviar` (231) e `ProcessarPendentes` (206) |
| Estatística | `ObterEstatisticas` (170) |
| Mapeamento | `MapToResponse` (350) |

Repetições e acoplamentos medidos:

| Padrão | Ocorrências |
|---|---|
| `try/catch` + `500` com `detalhes = ex.Message` | 7, uma por action de [NotificacoesController.cs](../../Controllers/NotificacoesController.cs) |
| Validação de `Tipo` e `Destinatario` | Duplicada: controller (88-93) e service (82-85) |
| Status `"PENDENTE"`, `"ENVIADO"`, `"FALHA"` e canal `"email"`, `"sms"` como string | Espalhados no service e nos filtros |
| `DateTime.UtcNow` para `DataAtualizacao` | 4 em `NotificacaoService` |
| Leitura de `IConfiguration["EmailSettings:..."]` | Direto nos métodos de envio, sem classe de opções |
| `MediatR` + `MediatR.Extensions.Microsoft.DependencyInjection` | Registrados em [Program.cs:38](../../Program.cs#L38), **nenhum handler existe** |

O envio é simulado: `Task.Delay` e falha aleatória com `new Random()` (10% no e-mail, 20% no SMS). O serviço parece funcional, mas **não envia nada** (MAPA §3.5). Também é síncrono dentro da requisição (`CriarNotificacao` chama `TentarEnviar`).

### 2. Comportamentos incorretos descobertos na leitura
| Ponto | Situação |
|---|---|
| `ReenviarNotificacao` | Não verifica `MaxTentativas` e permite reenviar o que já está `ENVIADO`. Zera `ErroMensagem` e volta para `PENDENTE`, mas mantém `Tentativas`. `NovoCanal` e `NovoDestinatario` não são validados. |
| `ProcessarPendentes` | Sem lock nem controle de concorrência: duas chamadas simultâneas pegam as mesmas pendentes. Lote fixo em `Take(50)`. |
| `ObterEstatisticas` | `ToListAsync()` carrega a tabela inteira e conta em memória. |
| `NotificacaoRequest.Mensagem` | Default `string.Empty`, então "ausente" e "vazia" são indistinguíveis. |
| Normalização | `ToUpper()` no status e `ToLower()` no canal só nos filtros. Na gravação nada é normalizado. |
| `Notificacao.MaxTentativas` | Valor 3 fixo na entidade. |
| `ConfiguracaoNotificacao` | Tabela e entidade existem, a lógica nunca foi implementada. |

### 3. Segurança
| Ponto | Situação |
|---|---|
| Autenticação | Inexistente. [Program.cs:76](../../Program.cs#L76) chama `UseAuthorization()` sem esquema de autenticação. `POST /api/notificacoes` e `POST /api/notificacoes/processar` ficam abertos: qualquer um dispara e-mail e SMS a partir do domínio (spam e phishing). |
| Swagger | `UseSwagger()` e `UseSwaggerUI()` em todos os ambientes ([Program.cs:63-68](../../Program.cs#L63-L68)). |
| CORS e hosts | `AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()` ([Program.cs:48-50](../../Program.cs#L48-L50)) e `AllowedHosts: "*"`. |
| Segredos | [appsettings.json](../../appsettings.json) é versionado (o `.gitignore` o deixa comentado de propósito) com senha do banco, `EmailSettings:SenderPassword` e `SmsSettings:ApiKey`. Esta ADR não reproduz os valores. Eles devem ser considerados comprometidos (MAPA T3). |
| Vazamento de informação | `detalhes = ex.Message` nas 7 actions do controller. [HealthController.cs:104-105](../../Controllers/HealthController.cs#L104-L105) devolve `smtpServer` e `smsApiUrl`, e as contagens de veículos e entregas de outros schemas. |
| Violação de bounded context | O `HealthController` abre conexão direta trocando `SearchPath` ([linhas 61 e 77](../../Controllers/HealthController.cs#L61)) e consulta `frotas.veiculos` e `entregas.entregas`. Acopla o schema de três serviços. |
| Injeção em template | `AplicarTemplate` faz `String.Replace` com valores sem escape. Em e-mail HTML permite injeção de HTML. |
| Dados em log | `[EMAIL FAKE]` registra destinatário e os 100 primeiros caracteres do corpo. `[SMS FAKE]` registra a mensagem inteira. |
| Validação de entrada | Sem checagem de canal (`email`/`sms`), formato do destinatário, tamanho de `Assunto`, `Mensagem` e `Variaveis`. `Tipo` e `Canal` livres, o que também permite lixo em `ReenvioRequest.NovoCanal`. |
| Proteções ausentes | Sem HTTPS redirect ([Program.cs:74](../../Program.cs#L74) comentado), sem rate limit, sem limite explícito de body. |
| Subida sem banco | `EnsureCreated()` dentro de `try/catch` que só imprime o aviso e segue ([Program.cs:80-95](../../Program.cs#L80-L95)). |

Não foi encontrada SQL injection: o acesso é por EF Core e as duas queries cruas do `HealthController` são estáticas.

### 4. SQL fora do lugar
O mesmo schema aparece em quatro lugares (MAPA §5.2):

| Fonte | Observação |
|---|---|
| [Data/migration.sql](../../Data/migration.sql) (62 linhas) | Cópia do `04`. A diferença para o workspace é só o cabeçalho, o `CREATE SCHEMA IF NOT EXISTS` e um `FIXME`. |
| [Data/seed.sql](../../Data/seed.sql) (35 linhas) | Cópia equivalente do `07` (33 linhas). Conferir o diff na implementação. |
| `rotalog-workspace/tools/scripts/04-migration-notificacoes.sql` e `07-seed-notificacoes.sql` | **São os usados pelo `docker-compose`.** |
| `context.Database.EnsureCreated()` | Cria as tabelas pelo modelo C#, que pode divergir do SQL. |

Dentro do código ainda há duas fontes do schema: `[Table(..., Schema = "notificacoes")]` nas entidades e `HasDefaultSchema("notificacoes")` no [DbContext](../../Data/NotificacoesDbContext.cs#L31). Os índices e a unicidade de template (`Tipo` + `Canal`) existem só como `TODO` no DbContext (linhas 36-39); no SQL há `idx_notificacoes_status`, `_tipo`, `_destinatario`, `_data_criacao` e `idx_templates_tipo_canal` (este não é `UNIQUE`).

### 5. Dependências e runtime
| Item | Situação |
|---|---|
| .NET 6 e EF Core 6 | Fora de suporte desde nov/2024 (MAPA §3.4). |
| Pacotes desalinhados | `Npgsql.EntityFrameworkCore.PostgreSQL` 6.0.8 × `Microsoft.EntityFrameworkCore` 6.0.12. |
| MediatR 11.1 e extensão de DI 11.0 | Peso morto. A extensão foi descontinuada e a biblioteca passou a ter licença comercial a partir da v13. |
| `Microsoft.EntityFrameworkCore.Design` | Presente, sem migrations. |
| Sem `global.json` | O SDK usado não é fixado. |
| `Swashbuckle.AspNetCore` 6.5.0 | Antigo. |
| Faltam | Logger estruturado, validação (FluentValidation), resiliência (Polly), `IHealthCheck`. |

### 6. Logs
Há **18 `Console.WriteLine`**, todos em [Program.cs:88-111](../../Program.cs#L88-L111): mensagens de banco e um banner de 15 linhas com a lista de endpoints, que fica desatualizada quando as rotas mudam e repete "port 5000" fixo (o `launchSettings.json` é quem define a porta). O resto usa `ILogger`, sem estrutura nem correlação (MAPA T6). O `appsettings.json` define só `Default: Information`.

### 7. Comentários em excesso
Há **116 linhas com `FIXME`/`TODO` em 9 arquivos `.cs`** (mais 1 no `appsettings.json` e 5 no `.csproj`/`.gitignore`):

| Arquivo | `FIXME`/`TODO` |
|---|---|
| `Services/NotificacaoService.cs` | 39 |
| `Program.cs` | 14 |
| `Controllers/HealthController.cs` | 13 |
| `Data/NotificacoesDbContext.cs` | 13 |
| `Models/Notificacao.cs` | 11 |
| `Controllers/NotificacoesController.cs` | 10 |
| `Models/ConfiguracaoNotificacao.cs` | 7 |
| `Models/TemplateNotificacao.cs` | 6 |
| `DTOs/NotificacaoRequest.cs` | 3 |

Padrões a remover: XML-doc que repete o nome ("Buscar notificação por ID" sobre `BuscarPorId`), cabeçalhos de classe que são só lista de `FIXME`, `FIXME` repetido sobre o mesmo assunto no mesmo arquivo ("sem interface" aparece 3 vezes) e `FIXME` que duplicam o MAPA. O cabeçalho de [Program.cs](../../Program.cs#L1-L8) está em inglês, o restante em português.

### 8. Sem testes e sem ferramentas de qualidade
Não existe projeto de testes, Dockerfile, CI, analisadores nem `.editorconfig`. A única validação é manual por [requests.http](../../requests.http) (251 linhas). `NotificacaoService` sem interface e o envio com `Random` tornam o código difícil de testar. `Program` também não é exposto como `partial`, o que impede `WebApplicationFactory`.

### 9. Documentação desatualizada
O [README.md](../../README.md) descreve `Domain/`, `Application/` e `Infrastructure/` (que não existem) e as rotas `POST /api/notificacoes/email`, `POST /sms`, `GET /historico` e `GET /health`, **nenhuma delas existe**. As rotas reais são `GET /api/notificacoes`, `GET /{id}`, `POST`, `POST /{id}/reenviar`, `GET /stats`, `GET /templates`, `POST /processar` e `GET /api/health`.

### 10. Contratos que a refatoração precisa preservar
A api-frotas (`NotificacaoClient`) e, no futuro, a api-entregas (`notificacaoService`, hoje não conectado) consomem esta API.

| Contrato | Observação |
|---|---|
| `POST /api/notificacoes` | Corpo com `tipo`, `destinatario`, `mensagem` e `canal` (a api-frotas envia `canal: "email"` fixo; o SMS usa `tipo: "SMS"`). Resposta `201` com `CreatedAtAction`. |
| Formato de erro | `{ "error": "..." }`, com `detalhes` nos `500`. |
| Rotas | As 8 listadas acima. `stats` e `templates` convivem com `{id}` porque `id` é `long`. |
| `GET /api/health` | Corpo com `service`, `status`, `timestamp`, `version` e `dependencies`. |
| JSON | camelCase. Valores de `Status` em maiúsculas (`PENDENTE`, `ENVIADO`, `FALHA`) e `Canal` em minúsculas. |
| Falha de envio | Hoje a criação responde `201` mesmo quando o envio falha (a notificação fica `PENDENTE` com `ErroMensagem`). |

## Decisão

Refatorar em fases, **mantendo o comportamento externo**, exceto onde indicado como mudança de contrato.

### D1. Dividir o `NotificacaoService` e organizar em camadas
Estrutura alvo, sem mudar nenhuma rota:

```
api-notificacoes/
├── Program.cs                     # só composição; public partial class Program
├── Configuration/                 # EmailOptions, SmsOptions, NotificacaoOptions, CorsOptions
├── Controllers/                   # só mapeia request -> service -> resposta
├── Services/
│   ├── INotificacaoService.cs / NotificacaoService.cs   # criar, buscar, listar, reenviar
│   ├── ITemplateRenderer.cs / TemplateRenderer.cs        # resolve e renderiza template
│   ├── NotificacaoProcessor.cs                           # TentarEnviar, lote, MaxTentativas
│   └── NotificacaoEstatisticaService.cs                  # contagens no banco
├── Canais/                        # ICanalNotificacao, EmailCanal, SmsCanal
├── Validators/                    # NotificacaoRequestValidator, ReenvioRequestValidator
├── Mapping/                       # NotificacaoMapper
├── Domain/                        # StatusNotificacao, CanalNotificacao (enums)
├── Middleware/                    # GlobalExceptionHandler
├── Data/                          # NotificacoesDbContext, Configurations/ (IEntityTypeConfiguration)
├── Models/ DTOs/
```

| Classe | Responsabilidade |
|---|---|
| `NotificacaoService` (`INotificacaoService`) | Criação, consulta, listagem e reenvio. Sem envio, sem template, sem estatística. |
| `TemplateRenderer` | Busca o template ativo por `(tipo, canal)` e renderiza. Faz **HTML-encode** das variáveis em e-mail HTML e valida variáveis obrigatórias. |
| `ICanalNotificacao` com `EmailCanal` e `SmsCanal` | Cada canal lê só a própria `Options` e envia. Hoje continuam fake, mas atrás da interface; o `Random` sai do código de produção e vira um simulador injetável (`IFalhaSimulada`) para teste e para o ambiente de desenvolvimento. Um provedor real entra depois, sem tocar no resto. |
| `NotificacaoProcessor` | `TentarEnviar`, retry, `MaxTentativas`, tamanho do lote configurável. |
| `NotificacaoEstatisticaService` | `CountAsync`/`GroupBy` no banco em vez de carregar a tabela. |
| `NotificacaoMapper` | `MapToResponse`. |

Outras extrações:

| Extrair | Substitui |
|---|---|
| `GlobalExceptionHandler` (`IExceptionHandler`) com `ProblemDetails` interno | 7 `try/catch` + `500` do controller. A resposta continua `{ error }` na fase 6 (ver D4). |
| Enums `StatusNotificacao` e `CanalNotificacao` com `HasConversion<string>()` | Strings espalhadas. O banco continua com texto, **nenhum SQL muda** (mesmo princípio da ADR da api-frotas). |
| Classes `Options` com `IOptions<T>` | `_configuration["EmailSettings:..."]` espalhado. |
| Validators (FluentValidation) | Validação duplicada entre controller e service. |
| Remoção de `MediatR` e `MediatR.Extensions...` | Registro sem nenhum handler. |

### D2. SQL: uma fonte de verdade, no workspace
- `rotalog-workspace/tools/scripts/04-migration-notificacoes.sql` e `07-seed-notificacoes.sql` passam a ser a **única** fonte do schema e do seed (já são o que o `docker-compose` executa).
- Antes de apagar `Data/migration.sql` e `Data/seed.sql`, fazer `diff` com o `04` e o `07`. O que existir só no serviço (por exemplo, `UNIQUE (tipo, canal)` em template, hoje só `TODO`) é **incorporado ao `04`** pelo mesmo PR do workspace. Depois os dois arquivos saem do serviço e o `README` aponta para o workspace.
- `EnsureCreated()` é removido. A subida usa `Database.CanConnectAsync()` e **falha quando o banco está fora** (comportamento hoje oposto, a confirmar, porque a API sobe sem banco).
- Schema, índices e limites passam para **Fluent API** em `Data/Configurations/*Configuration.cs` (`IEntityTypeConfiguration<T>`), e `[Table(Schema=...)]` sai das entidades. `HasDefaultSchema` fica como única declaração do schema.
- **Fora do escopo:** adotar migrations do EF Core ou Flyway (MAPA §5.2: decisão do `rotalog-workspace`). `Microsoft.EntityFrameworkCore.Design` permanece instalado só enquanto for útil para o *scaffold*; reavaliar depois.

> A mudança em `rotalog-workspace` é um PR separado, no outro repositório.

### D3. Segurança sem mudança de contrato (fase 6)
- **Swagger** só em `Development`.
- **CORS** com origens vindas de configuração (padrão: os dois frontends locais, `:4200` e `:3001`). `AllowedHosts` restrito por ambiente.
- **HealthController** deixa de abrir conexão com `frotas` e `entregas` e deixa de devolver `configuration`. Passa a checar só o próprio banco (D7).
- **Erros:** `detalhes` sai das respostas (a mensagem vai para o log). O campo `error` é mantido.
- **Validação de entrada** (FluentValidation): `tipo` obrigatório com tamanho máximo, `canal` em `{ email, sms }`, `destinatario` com e-mail válido no canal `email` e telefone no canal `sms`, tamanhos máximos de `assunto`, `mensagem` e `variaveis` (quantidade e tamanho de chave/valor), `mensagem` como nullable para distinguir ausente de vazia. `ReenvioRequest.NovoCanal` e `NovoDestinatario` validados do mesmo jeito. Respostas continuam `400` com `{ error }`.
- **Template:** valores das variáveis passam por `HtmlEncoder` em e-mail HTML.
- **Limites:** `MaxRequestBodySize` explícito no Kestrel e rate limit (`AddRateLimiter`) em `POST /api/notificacoes` e `POST /api/notificacoes/{id}/reenviar`.
- **HTTPS:** `UseHttpsRedirection` e HSTS fora de `Development`.
- **Logs:** sem corpo de mensagem; destinatário mascarado (`a***@dominio.com`, `***1234`).
- **Segredos:** `appsettings.json` sai do versionamento, entra `appsettings.Example.json` sem valores reais, e as credenciais vêm de variáveis de ambiente ou *user-secrets*. Sem credencial padrão no código. **Rotação** das senhas atuais (MAPA T3).
- `.gitignore` corrigido (`appsettings.json`, `appsettings.*.json` exceto o exemplo, `.env`).

### D4. Mudanças que alteram contrato (fase 7)
Cada item é aprovado e comunicado antes do merge.
- **Autenticação** em `POST /api/notificacoes`, `POST /{id}/reenviar` e `POST /processar`: chave de API por serviço de origem (`api-frotas`, `api-entregas`) ou JWT, alinhado com a decisão de IdP do MAPA T2. A api-frotas e a api-entregas precisam enviar o cabeçalho.
- **`/processar`:** sai da API pública e vira `BackgroundService` agendado, ou fica restrito a perfil administrativo. Com lock (`FOR UPDATE SKIP LOCKED` ou equivalente) para evitar processamento duplo.
- **Reenvio:** recusar `ENVIADO` e respeitar `MaxTentativas` (`409`).
- **Paginação** em `GET /api/notificacoes` (hoje devolve tudo).
- **Formato de erro** `ProblemDetails` no lugar de `{ error }` (T1).
- **Envio real** de e-mail e SMS pelo `ICanalNotificacao`, com timeout e retry com backoff (Polly ou `Microsoft.Extensions.Http.Resilience`).
- **Falha de envio** passar a ser sinalizada de forma explícita na resposta de criação, ou o envio sair da requisição (fila em memória com `Channel<T>` + `BackgroundService`).

> ⚠️ **Muda o contrato.** A api-frotas e a api-entregas consomem esta API. Avisar antes do merge e verificar a integração dos dois.

### D4b. Atualização de runtime: .NET 6 → .NET 10 LTS
Faz parte desta ADR. Saltos pelo mesmo motivo (MAPA §3.4, T7), em PR próprio e **sem mudança de lógica**, depois da caracterização e **antes** da segurança, porque `IExceptionHandler`, `AddRateLimiter` e `ProblemDetails` dependem de versões recentes.

- **Alvo:** .NET 10 LTS, com EF Core 10 e `Npgsql.EntityFrameworkCore.PostgreSQL` 10. O .NET 8 termina o suporte em nov/2026, por isso não é o alvo. **Confirmar as datas e versões nas páginas oficiais antes de implementar** (esta ADR cita o calendário de memória).
- `TargetFramework` e `global.json` fixando o SDK; versões dos pacotes alinhadas entre si.
- Atualizar `Swashbuckle.AspNetCore` ou adotar o OpenAPI nativo do ASP.NET Core, restrito a `Development`.
- Remover `MediatR` aqui, se ainda não tiver saído na limpeza.
- **Riscos a testar:** mudança de mapeamento de `DateTime`/`timestamp` no Npgsql 6+ (já em uso: `DateTime.UtcNow` gravado em colunas `timestamp`); mudanças de comportamento de `Nullable` e *minimal hosting*; fim de `Microsoft.EntityFrameworkCore.Design` 6 para *tooling*.
- Salto direto 6 → 10 é aceitável aqui por ser serviço pequeno e coberto por testes de caracterização; se o build quebrar em muitos pontos, passar por 8 como etapa intermediária.
- As ADRs de Node (api-entregas), Spring Boot / Java (api-frotas) e Angular têm calendário próprio e **não entram** aqui.

### D5. Logs e comentários
- Remover os 18 `Console.WriteLine` de `Program.cs`. Fica uma linha de ambiente e URL via `ILogger`. A lista de endpoints sai (o Swagger já a documenta).
- **Serilog** (`Serilog.AspNetCore`) com saída estruturada e `RequestLogging` sem corpo e sem query sensível. Nível controlado por configuração.
- Remover XML-doc que repete o nome do método, os cabeçalhos só de `FIXME`, os `FIXME` resolvidos e os duplicados. O que sobrar aponta para esta ADR ou para uma seção do MAPA. Comentário só onde há regra não óbvia (por exemplo, por que `stats` não conflita com `{id}`).
- Feito em PR próprio, sem mudança de lógica, para facilitar a revisão.
- README reescrito com a estrutura e as rotas reais, junto da fase de reorganização.

### D6. Estratégia de testes
Hoje a cobertura é zero. Esta é a base das demais decisões: **nenhuma fase entra sem os testes da fase anterior verdes**.

**Ferramentas**
- Projeto `api-notificacoes.Tests` ao lado do serviço, com xUnit, Moq (ou NSubstitute), FluentAssertions e `coverlet`.
- `public partial class Program {}` para usar `WebApplicationFactory<Program>`.
- Banco de teste **PostgreSQL**: Testcontainers, ou o do `docker-compose up -d postgres` em suíte separada. **InMemory e SQLite não servem**: o schema `notificacoes` e os tipos são do PostgreSQL.
- Pastas: `Unit`, `Integration`, `Contract`.

**Camadas**
| Camada | O que cobre |
|---|---|
| Caracterização | Comportamento **atual**, escrito antes de refatorar, inclusive o "errado" que precisa ser preservado: reenvio de notificação `ENVIADO`, `/processar` sem autenticação, `201` mesmo com envio falho, filtro com `status` em maiúsculas e `canal` em minúsculas. |
| Unitários | `TemplateRenderer`, `NotificacaoProcessor`, canais, validators, mapper, estatística. |
| Integração HTTP | `WebApplicationFactory` com banco real. |
| Contrato | Payload enviado pela api-frotas (`tipo`, `destinatario`, `mensagem`, `canal`), formato de erro `{ error }` e corpo do `/api/health`. |

**Casos mínimos**
- **POST /notificacoes:** sucesso; sem tipo, destinatário ou mensagem; com `variaveis` e template ativo; template inexistente; variável ausente; canal inválido; falha de envio (continua `201`); valor de variável com HTML.
- **GET /notificacoes:** filtros `tipo`, `status`, `canal`, `servicoOrigem`; ordenação por `DataCriacao` decrescente.
- **GET /{id}:** encontrado, `404`, id não numérico.
- **Reenviar:** sucesso, `404`, notificação já `ENVIADO` (caracterização), `MaxTentativas` (fase 7).
- **Processar:** respeita o lote, ignora o que atingiu `MaxTentativas`, marca `FALHA` na última tentativa.
- **Stats:** totais por status, tipo e canal.
- **Templates:** `apenasAtivos`.
- **Health:** banco fora de ar devolve `DOWN`; sem `configuration` e sem contagens de outros schemas após a D3.
- **Erros:** `500` sem `detalhes`; JSON malformado; rota inexistente.
- **Segurança:** Swagger indisponível fora de `Development`; CORS por origem; rate limit.
- **Logs:** teste (ou analisador) que falha se `Console.Write*` voltar ao `src`.

**Meta e qualidade**
- Cobertura sugerida ≥ 80% de linhas em services, validators, canais e processor, com limite no CI para não regredir.
- `.editorconfig`, analisadores do .NET e `dotnet format` em CI (`dotnet restore && dotnet build -warnaserror && dotnet test`) como item opcional da fase 2.
- O `requests.http` continua como roteiro manual.
- O projeto de testes só será criado quando esta ADR for implementada.

### D7. Health real
- `AddHealthChecks()` com verificação do `DbContext` (`AddDbContextCheck` ou `AddNpgSql`). `GET /api/health` mantém o formato (`service`, `status`, `timestamp`, `version`, `dependencies`), com `version` lida do assembly.
- **Sem** `frotas_db`, `entregas_db` e `configuration`. Se a disponibilidade da api-frotas e da api-entregas for desejada, vira chamada HTTP aos respectivos `/health`, com timeout curto, e não consulta ao banco delas.
- Encerramento limpo: o host do .NET já trata `SIGTERM`; garantir que o `BackgroundService` do `/processar` (fase 7) respeite o `CancellationToken`.

## Alternativas consideradas

| Alternativa | Motivo da rejeição / adiamento |
|---|---|
| Só limpar logs e comentários | Não reduz as responsabilidades do service nem resolve segurança e testes. Vira a **fase 2**, não a solução completa. |
| Manter o MediatR e criar handlers (CQRS) | Escopo maior sem demanda real, e a licença comercial a partir da v13 pesa. A divisão por serviços de D1 resolve o mesmo problema. **Rejeitado.** |
| Fila externa (RabbitMQ, Kafka, SQS) agora | Escopo de arquitetura entre serviços. `ICanalNotificacao` e `NotificacaoProcessor` já isolam o ponto de troca. Passo intermediário: `Channel<T>` + `BackgroundService`. **Adiado.** |
| Migrations do EF Core no serviço | O schema é propriedade do workspace (MAPA §5.2). **Rejeitado** nesta ADR. |
| Parar no .NET 8 | O suporte termina em nov/2026. **Rejeitado.** |
| Atualizar o .NET só no fim | As fases de segurança usam `IExceptionHandler`, `AddRateLimiter` e `ProblemDetails`. **Rejeitado.** |
| Autenticação JWT já na primeira fase | Derruba a api-frotas (e a api-entregas, quando conectada) sem token. Fica na **fase 7**, com aviso. |
| Provedor real de e-mail/SMS junto da refatoração | Muda comportamento (passam a sair mensagens) e exige credenciais reais. Fica na **fase 7**, atrás de `ICanalNotificacao`. |
| `AutoMapper` | Mapeamento é pequeno. Um `NotificacaoMapper` manual basta e evita dependência com licença comercial. |

## Consequências

**Positivas**
- Service dividido em classes pequenas, testáveis e com uma razão para mudar.
- Menos repetição (`try/catch`, validação, strings de status).
- Superfície de ataque menor (sem `detalhes`, sem Swagger em produção, sem segredos versionados, sem acesso cross-schema) e caminho claro para autenticação.
- Runtime suportado e pacotes alinhados.
- Uma só fonte de verdade para o SQL.
- Cobertura onde hoje há zero, protegendo os contratos da api-frotas e da api-entregas.

**Negativas / riscos**
- Mais arquivos e pastas no módulo.
- Salto 6 → 10 pode trazer *breaking changes* (principalmente `DateTime` no Npgsql).
- Falhar a subida sem banco pode surpreender quem roda a API sem o Postgres.
- A fase 7 muda contrato e exige coordenação com a api-frotas e a api-entregas.
- Remover `Data/*.sql` exige a mudança correspondente no `rotalog-workspace`.
- Remover comentários apaga contexto histórico do curso. O MAPA e esta ADR passam a ser o registro.

**Não muda**
- Rotas, métodos, nomes de campos e formato de resposta, exceto os itens da D4.
- A porta 5000 e o schema `notificacoes`.
- A escolha de EF Core e PostgreSQL.
- O modelo de dados (`Notificacao`, `TemplateNotificacao`, `ConfiguracaoNotificacao`). A lógica de `ConfiguracaoNotificacao` (preferências, horário silencioso) **continua não implementada**; decidir em outra ADR se ela entra ou sai.
- A decisão de manter `appsettings.json` versionado **só vale até a rotação de segredos**; depois dela ele sai do controle de versão.

## Plano de implementação

Cada fase deve ser um PR/commit independente.

1. **Infra de testes e caracterização:** projeto de testes, `public partial class Program`, banco de teste PostgreSQL, testes de caracterização e de contrato.
2. **Limpeza:** logs (D5), comentários, remoção do MediatR, README, `.gitignore`, `appsettings.Example.json`, remoção de `Data/*.sql` com a mudança correspondente no workspace (D2). Opcional: `.editorconfig`, analisadores e CI.
3. **Atualização para .NET 10 LTS (D4b)**, com os testes da fase 1 verdes antes e depois.
4. **Configuração tipada** (`Options`) e **canais atrás de interface** (`ICanalNotificacao`).
5. **Extração em camadas (D1):** `TemplateRenderer`, `NotificacaoProcessor`, `NotificacaoEstatisticaService`, `NotificacaoMapper`, enums, Fluent API, `IExceptionHandler`, validators.
6. **Segurança sem mudança de contrato (D3)**, health real (D7) e rotação de segredos.
7. **Mudanças que alteram contrato (D4),** cada uma aprovada e comunicada.

## Verificação (quando for implementar)
- `dotnet --list-sdks` mostrando o SDK alvo, `dotnet restore && dotnet test` com as suítes unit, integration e contract verdes e a meta de cobertura atingida.
- Comparar `timestamp` gravado e lido antes e depois da atualização do .NET.
- Subir a API com o Postgres (`docker-compose up -d postgres` em `rotalog-workspace`) e exercitar todas as rotas do `requests.http`, comparando as respostas antes e depois de cada fase.
- Conferir que a api-frotas ainda notifica (cadastro de veículo e motorista) e que a api-entregas continua funcionando.
- `grep -rn "Console\." --include=*.cs .` sem resultados.
- Provocar um erro `500` e confirmar que a resposta não traz `detalhes`.
- `GET /api/health` sem `configuration`, sem contagens e sem acesso aos schemas `frotas` e `entregas`.
- Confirmar que `/swagger` responde `404` fora de `Development`.
- Rodar a API com o banco fora e confirmar o comportamento decidido na D2.
