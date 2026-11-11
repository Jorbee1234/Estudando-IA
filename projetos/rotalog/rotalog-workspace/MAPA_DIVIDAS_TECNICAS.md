# Mapa de Dívidas Técnicas — RotaLog

> Análise estática do código-fonte dos 5 projetos (data: 2026-11-08). Nada foi executado: não rodei build, testes, `npm audit` nem `mvn dependency:check`. Os achados vêm da leitura do código e dos manifestos.
>
> **Contexto:** o `CLAUDE_CONTEXT.md` descreve o RotaLog como um sistema legado com dívida técnica *intencional* (material do curso da Alura). Boa parte do que está aqui já aparece como `FIXME`/`TODO` no código. Itens marcados com 🔎 **não** estão sinalizados no código e foram descobertos na leitura. Em geral são os mais valiosos, porque ninguém sabia deles.

**Severidade:** 🔴 alta (quebra funcionalidade ou expõe o sistema) · 🟠 média · 🟡 baixa

---

## Visão geral

| Projeto | Stack | Arquitetura | Inconsistência | Segurança | Dependências | Infra | Acessib. | Organização | Duplicação |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| [rotalog-api-entregas](#1-rotalog-api-entregas-nodejs--express) | Node 18 / Express / Sequelize | 🟠 | 🟠 | 🔴 | 🟠 | 🟠 | n/a | 🟡 | 🟠 |
| [rotalog-api-frotas](#2-rotalog-api-frotas-java--spring-boot) | Java 11 / Spring Boot 2.7 | 🟠 | 🟠 | 🔴 | 🔴 | 🟠 | n/a | 🟡 | 🔴 |
| [rotalog-api-notificacoes](#3-rotalog-api-notificacoes-net-6) | .NET 6 / EF Core 6 | 🟠 | 🟡 | 🔴 | 🔴 | 🟠 | n/a | 🟡 | 🟡 |
| [rotalog-frontend](#4-rotalog-frontend-nx-angular--react) | Nx 19 / Angular 18 / React 18 | 🔴 | 🔴 | 🔴 | 🔴 | 🟠 | 🔴 | 🔴 | 🔴 |
| [rotalog-workspace](#5-rotalog-workspace-docker--sql) | Docker Compose / PostgreSQL 14 | 🟠 | 🟡 | 🟠 | 🟡 | 🔴 | n/a | 🟠 | 🟠 |

### Os 8 problemas que mais merecem atenção

1. 🔴 🔎 **O painel admin não consegue criar veículos nem motoristas**, porque o contrato de campos entre frontend e `api-frotas` não bate (§4.2). A API recebe `ano`, lê `anoFabricacao = null` e rejeita com "Ano de fabricação inválido".
2. 🔴 🔎 **O botão "Excluir" do painel chama `DELETE /api/veiculos/{id}`, que não existe na API Java** (§4.2).
3. 🔴 **A autenticação da api-entregas é um bypass.** Sem `NODE_ENV=production` ela libera tudo. Em produção aceita qualquer string com 10 ou mais caracteres. `jsonwebtoken` nem está nas dependências (§1.3).
4. 🔴 🔎 **XSS armazenado no mapa de rastreamento.** Endereços e nome do motorista vão direto para o HTML do `bindPopup` do Leaflet (§4.3).
5. 🔴 **Segredos versionados.** Há senha do banco, `JWT_SECRET`, senha SMTP e chave de SMS em `.env`, `application.properties`, `appsettings.json` e `docker-compose.yml`.
6. 🔴 🔎 **A api-entregas nunca dispara notificações.** `notificacaoService.js` não é importado por nenhum arquivo, e as flags `ENABLE_*` do `.env` não são lidas (§1.2).
7. 🔴 🔎 **`EntregaClient` do Java compara status em minúsculas (`"em_transito"`) com o que a API grava em maiúsculas (`EM_TRANSITO`).** `veiculoTemEntregasAtivas()` sempre retorna `false` (§2.2).
8. 🔴 **Runtimes e frameworks fora de suporte:** Node 18, .NET 6, Spring Boot 2.7 / Java 11 e Angular 18 (§ "Estado de dependência" de cada projeto).

---

## 1. rotalog-api-entregas (Node.js / Express)

### 1.1 Problemas de arquitetura
- 🟠 **Lógica de negócio dentro das rotas.** [routes/entregas.js](../rotalog-api-entregas/src/routes/entregas.js) concentra validação, cálculo de distância/ETA, geração de número de pedido, transição de status e criação de eventos de rastreamento. Não existe camada de serviço para o domínio de entregas, só para integrações.
- 🟠 **Sem máquina de estados.** `PATCH /:id/status` aceita qualquer transição (um `ENTREGUE` pode voltar a `PENDENTE`). `DELETE` cancela entregas já entregues.
- 🟠 **`routes/frotas.js` é um proxy improvisado** que a própria equipe chama de "deveria ser BFF/API Gateway". Não há cache, circuit breaker nem timeout.
- 🟠 **Dados denormalizados.** `motorista_nome` e `veiculo_modelo` são copiados do api-frotas e vêm do cliente em `/atribuir`. Não são verificados contra o serviço de frotas, então o cliente pode gravar qualquer valor (`routes/entregas.js:287-311`).
- 🟠 **Sem transação** entre `entrega.save()` e `Rastreamento.create()`. Uma falha no meio deixa a entrega alterada sem evento de histórico.
- 🟡 Sem associações/FK no banco para `rastreamentos.entrega_id`. O Sequelize declara o `hasMany`, mas o SQL não cria a constraint.
- 🟡 Sem graceful shutdown. O `unhandledRejection` só loga, e o `uncaughtException` faz `process.exit(1)` sem fechar o pool.
- 🔴 🔎 **Código morto com impacto funcional:** `services/notificacaoService.js` (134 linhas) nunca é importado. **Nenhuma notificação sai da api-entregas.** O mesmo vale para `ENABLE_TRACKING`, `ENABLE_NOTIFICATIONS` e `ENABLE_CACHE`, que ninguém lê.

### 1.2 Inconsistências de código
- 🟠 **Mistura de callbacks, `.then()` e `async/await`.** `/stats`, `/pedido/:n`, `DELETE`, `POST /rastreamento/:id` e todo o `frotasService` usam promessas ou callbacks. As demais rotas usam async/await. Há `var` e `function(){}` ao lado de `const` e arrow functions.
- 🟠 **Formato de erro e status HTTP variam.** Alguns handlers devolvem `{error}`, outros `{error, detalhes: error.message}`. Os 404 dizem "Pedido não encontrado" ou "Entrega não encontrada". O proxy de frotas devolve 502.
- 🟠 🔎 **Filtro de motorista inconsistente com o cliente.** A API lê `?motorista_id=`, mas o painel Angular envia `?motorista=` (§4.2).
- 🟡 `status` filtrado com `.toUpperCase()` na listagem, mas comparado de forma estrita no `PATCH`.
- 🟡 Timestamps manuais (`data_criacao`/`data_atualizacao`) com `timestamps:false`, em vez de usar os hooks do Sequelize.
- 🟡 Geração de `numero_pedido` com `Date.now()` + `Math.random()` (colisão possível, a coluna é `UNIQUE`). A distância é calculada pela hipotenusa de graus × 111, não por Haversine.
- 🟡 Comentário de CORS no cabeçalho diz "permite tudo", e o código de fato libera tudo.

### 1.3 Vulnerabilidades de segurança
- 🔴 **Bypass de autenticação** ([middleware/auth.js:16](../rotalog-api-entregas/src/middleware/auth.js#L16)). Qualquer `NODE_ENV` diferente de `production` (inclusive *vazio*) libera a requisição. Em produção, basta um Bearer com 10 ou mais caracteres para virar `admin` fixo (`id:1`). Não há verificação de assinatura nem de expiração.
- 🔴 **Rotas de escrita sem autenticação.** `/api/rastreamento` não tem `authMiddleware`, e `POST /api/rastreamento/:id` permite a qualquer um injetar eventos e posições falsas.
- 🔴 **Segredos no repositório.** O `.env` está versionado (o `.gitignore` tem a linha `.env` comentada de propósito) com `DB_PASSWORD` e `JWT_SECRET`. O mesmo valor está de fallback em `config/database.js:20` e `auth.js:12`.
- 🟠 **CORS `*`** com todos os métodos, escrito à mão.
- 🟠 **Sem rate limiting, `helmet` ou limite de tamanho de body.** O endpoint público `/rastreamento/pedido/:numero` permite enumerar pedidos.
- 🟠 **Vazamento de informação:** o `errorHandler` devolve `err.stack` fora de produção e loga `req.body` completo. Várias rotas devolvem `detalhes: error.message`.
- 🟠 **Mass assignment parcial / sem validação de tipo.** Nada valida lat/lng, `peso_kg` nem o `evento` (texto livre) em `POST /rastreamento`. IDs de rota não são validados antes de ir ao Sequelize.
- 🟡 Conexão ao banco sem SSL. `logging: console.log` imprime todo o SQL com parâmetros.
- ✅ Não encontrei SQL injection: a única query raw (`/stats`) é estática e o resto usa o ORM.

### 1.4 Estado de dependências
- 🔴 **Node 18** (declarado no `CLAUDE_CONTEXT.md`) está fora do suporte da comunidade desde abril de 2025.
- 🟠 `package.json` não declara `engines`, e não há `.nvmrc`.
- 🟠 **Lockfile ignorado:** `package-lock.json` está no `.gitignore` apesar de existir no disco. Os builds não são reproduzíveis, e todas as versões usam `^`.
- 🟠 `nodemon ^2.0.20` está defasado. `express ^4`, `sequelize ^6` e `pg ^8` estão na linha antiga, mas ainda mantidos (confirmar com `npm outdated`).
- 🟡 Falta `jsonwebtoken` (ou equivalente), apesar de a autenticação se chamar JWT. Falta também `helmet`, `express-rate-limit`, `joi`/`zod` e um logger (`pino`/`winston`).
- 🟡 `script test` é `echo "Error: no test specified" && exit 1`. **Não há nenhum teste.**

### 1.5 Qualidade da infraestrutura
- 🟠 **`/api/health` mente.** Devolve `database: 'UNKNOWN'` fixo e `version: '1.0.0'` fixo. Não serve para readiness/liveness.
- 🟠 Sem `Dockerfile`, CI, lint (ESLint/Prettier) nem testes.
- 🟠 `sequelize.sync()` roda na subida, enquanto o schema oficial é criado por SQL externo. Há três fontes de verdade para o schema (§5.2).
- 🟠 `testConnection()` engole o erro e a API sobe mesmo sem banco.
- 🟡 Logs com `console.log` e concatenação de strings, sem nível nem correlação. A configuração de pool é mínima (`max:5`).

### 1.6 Acessibilidade
Não se aplica (API). 🟡 Mensagens de erro misturam português e termos técnicos. Considere códigos de erro estáveis para o front traduzir.

### 1.7 Organização do código
- 🟡 Três arquivos SQL em `src/config/` (`migration.sql`, `populate.sql`, `seed.sql`) parecem equivalentes a `rotalog-workspace/tools/scripts/03` e `06` (os tamanhos diferem um pouco; não comparei o conteúdo). Só `migration.sql` e `seed.sql` são usados pelos scripts `db:*`; `populate.sql` não é referenciado.
- 🟡 `models/index.js` define as associações, os models não. Não há pastas `controllers/`, `validators/` ou `repositories/`.
- 🟡 A lista de endpoints está escrita à mão no `console.log` do `index.js`, e vai ficar desatualizada quando as rotas mudarem.

### 1.8 Código repetido que poderia virar função
| Onde | O que se repete | Extrair para |
|---|---|---|
| `services/frotasService.js` (4 funções) | O bloco `http.get` → acumula `data` → `on('end')` → `JSON.parse` → trata 200/404/erro aparece **4 vezes** | `httpGetJson(url)` (Promise) usando `fetch` nativo do Node 18 |
| `services/notificacaoService.js` | `notificarEntregaCriada/MudancaStatus/Concluida/Atraso` só variam tipo, destinatário e texto | `notificar(tipo, destinatario, mensagem)` com tabela de templates |
| `routes/entregas.js` | `findByPk` + 404 + `Rastreamento.create` + `catch` + `500` se repetem em `PUT`/`PATCH status`/`PATCH atribuir`/`DELETE` | Middleware `carregarEntrega` e `registrarEvento(entrega, evento, descricao)` |
| `routes/*.js` | `try/catch` com `console.error` + `res.status(500)` em todo handler | Wrapper `asyncHandler` + o `errorHandler` global já existente |
| `routes/frotas.js` | 4 handlers quase idênticos (`err → 502`, `!x → 404`, `res.json`) | Helper `proxyFrotas(fn)` |
| `rastreamento.js` / `entregas.js` | `Rastreamento.findAll({where:{entrega_id}, order:[['data_evento','DESC']]})` aparece 3× | `Rastreamento.porEntrega(id)` (método estático do model) |

---

## 2. rotalog-api-frotas (Java / Spring Boot)

### 2.1 Problemas de arquitetura
- 🟠 **`Veiculo` usa `InheritanceType.TABLE_PER_CLASS` sem ter subclasses.** A estratégia só traz custo (consultas polimórficas viram `UNION`) e nenhum benefício. Remova a anotação. Se um dia houver subclasses, a combinação com `GenerationType.IDENTITY` pode ser problemática (verificar).
- 🟠 **`VeiculoService` mistura responsabilidades:** validação, regras de manutenção, notificação, estatística e um "sincronizar" vazio. Há regras com valores fixos (`50000L` km, `10000L`, `0.05`/`500.0` de custo).
- 🟠 **Relacionamentos só por ID.** `Manutencao.veiculoId` é um `Long` solto, sem `@ManyToOne` nem FK no SQL. Um veículo pode ser removido com manutenções órfãs.
- 🟠 **Acoplamento síncrono e bloqueante.** `NotificacaoClient`/`EntregaClient` usam `RestTemplate` sem timeout. Uma api-notificacoes lenta trava a requisição de cadastro de veículo/motorista.
- 🟠 **Efeito colateral em GET:** `MotoristaService.listarComCnhVencida()` dispara **uma notificação HTTP por motorista a cada chamada**. Uma leitura envia e-mails repetidos ao RH.
- 🟠 **Sem `@Transactional`.** `iniciarManutencao`/`concluirManutencao` gravam `Veiculo` e `Manutencao` em duas operações separadas.
- 🟠 Controllers devolvem **entidades JPA** diretamente (acoplam API ao schema). O `/estatisticas` devolve JSON montado com `String.format`.
- 🟡 Serviços injetam por `@Autowired` em campo, o que dificulta teste.
- 🟡 Não há camada de eventos/outbox. A notificação é *fire-and-forget* dentro do fluxo de negócio.

### 2.2 Inconsistências de código
- 🔴 🔎 **Status em caixa diferente entre serviços.** `EntregaClient.veiculoTemEntregasAtivas` compara `"em_transito"`/`"pendente"` (minúsculas), mas a api-entregas grava `EM_TRANSITO`/`PENDENTE`. Resultado: sempre `false`. Também ignora `ATRIBUIDA`.
- 🟠 **Estados de manutenção sem validação:** `iniciarManutencao` só faz `log.warn` se o status não for `PENDENTE`. `concluirManutencao` e `cancelarManutencao` aceitam qualquer origem.
- 🟠 **Regras contraditórias:** `atualizarVeiculo` só avisa (`log.warn`) quando o km diminui, enquanto `atualizarQuilometragem` rejeita negativos mas também só avisa quando o km diminui (usa `System.out.println`).
- 🟠 **Tratamento de erro com `RuntimeException` genérica**, sempre capturada no controller com `catch (RuntimeException)`. O status HTTP depende do método (um "não encontrado" vira 400 em `PUT`/`PATCH`, 404 em `GET`).
- 🟠 `precisaDeManutencao` chama `buscarPorId` de novo, depois de o veículo já ter sido carregado (uma consulta extra por atualização de km).
- 🟡 Mistura de `System.out.println` e `@Slf4j`, de logs em PT e EN e de `Double`/`Boolean` boxed onde bastaria primitivo.
- 🟡 Typo mantido no nome público: `obterEstatisticasFreita`.
- 🟡 O mesmo `VeiculoRequest` serve para criar e atualizar, mas `registrarVeiculo` ignora a `quilometragem` enviada (força `0L`) e a atualização é parcial. Os dois fluxos pedem DTOs diferentes.
- 🟡 `findMotoristasComCnhVencida` e `findUltimaManutencao` usam SQL nativo onde JPQL/derived query serviria.

### 2.3 Vulnerabilidades de segurança
- 🔴 **Sem autenticação nem autorização** em nenhum endpoint (`desativar`, `cadastrar`, `concluir`…). `spring-boot-starter-security` não está no `pom.xml`.
- 🔴 **Credenciais em `application.properties`** (usuário e senha fixos), versionadas.
- 🟠 **CORS `allowedOrigins("*")`** para todos os verbos.
- 🟠 **Sem Bean Validation.** `spring-boot-starter-validation` está no `pom.xml`, mas nenhum DTO usa `@Valid`/`@NotNull`. `cnh` só valida o tamanho (11 caracteres, sem checar se é numérico).
- 🟠 **Logs excessivos em produção:** `show-sql=true`, `org.hibernate.type.descriptor.sql.BasicBinder=TRACE` (loga valores de parâmetros, como CNH e nome) e `org.springframework.web=DEBUG`.
- 🟠 **Mensagens de exceção devolvidas ao cliente** (`e.getMessage()`), o que expõe detalhes como a CNH consultada.
- 🟡 Sem Actuator, mas há um `HealthCheckController` manual que chama `localhost:3000/5000` a cada chamada, sem timeout. Pode ser usado para amplificar carga.
- 🟡 O CPF/telefone/e-mail que o painel espera nunca chegam à API (§4.2), então não há PII sensível *ainda*, mas o `Motorista` já guarda CNH.

### 2.4 Estado de dependências
- 🔴 **Spring Boot 2.7.14 e Java 11.** A linha 2.7 chegou ao fim do suporte OSS em nov/2023 e o Java 11 só tem suporte comercial. Isso implica `javax.persistence.*`, que exige migração para Jakarta (Boot 3) quando for atualizar.
- 🟠 **`postgresql` 42.5.1 fixado manualmente**, sobrescrevendo o BOM do Spring. Há correções de segurança em 42.5.x posteriores (verificar o CVE-2024-1597 e o BOM atual).
- 🟠 **`flyway-core 8.5.1` fixado manualmente**, mas o Flyway está **desabilitado** (`spring.flyway.enabled=false`). É dependência carregada sem uso, e as migrações `V1`/`V2` em `db/migration` estão órfãs (§5.2).
- 🟠 Plugins Maven fixados em versões antigas (`maven-compiler-plugin 3.8.0`, `surefire 2.22.1`…). Falta `maven-wrapper`: o `CLAUDE_CONTEXT.md` manda rodar `./mvnw`, mas **não existe `mvnw` no projeto**.
- 🟡 Lombok 1.18.34 declarado duas vezes (dependência e `annotationProcessorPaths`). `spring-boot-starter-logging` é redundante (já vem no starter-web).
- 🟡 `target/` presente no disco. Está no `.gitignore`, mas confira se não foi commitado.

### 2.5 Qualidade da infraestrutura
- 🔴 **Nenhum teste** (sem `src/test`), embora `spring-boot-starter-test` esteja declarado.
- 🟠 Sem Dockerfile, CI, Actuator/health real, profiles (`dev/prod`) nem configuração externa. As URLs de `localhost:3000/5000` estão fixas em 3 classes, com um `TODO` no `.properties`.
- 🟠 `ddl-auto=validate` com Flyway desligado: o schema depende de scripts executados por outro repositório (workspace).
- 🟡 Sem paginação, cache, métricas (Micrometer) nem tracing.

### 2.6 Acessibilidade
Não se aplica (API).

### 2.7 Organização do código
- 🟡 Estrutura em camadas clara (`controller/domain/dto/repository/service`), com bom ponto de partida. Falta `exception/` e `mapper/` (entidade ↔ DTO de resposta), e `config/` só tem CORS.
- 🟡 **Código morto:** `VeiculoService.agendarManutencaoPreventiva`, `calcularCustoManutencao`, `sincronizarComSistemaExterno`, `NotificacaoClient.enviarSms`, `EntregaClient.buscarEstatisticasEntregas`, `findVeiculosComQuilometragemAcimaDe`, `findByNomeContainingIgnoreCase`, entre outros, não têm chamadores. O `agendarManutencaoPreventiva` calcula `intervaloQuilometragem` e `intervaloMeses` e não os usa.
- 🟡 Enumerações de status viram `String` em 3 entidades (`ATIVO`, `PENDENTE`…), com valores repetidos nos serviços.

### 2.8 Código repetido que poderia virar função
| Onde | O que se repete | Extrair para |
|---|---|---|
| 3 controllers (≈25 blocos) | `try { … } catch (RuntimeException e) { Map error = new HashMap(); error.put("erro", …); return status(…).body(error); }` | `@RestControllerAdvice` com exceções tipadas (`NotFoundException`, `BusinessException`) |
| `VeiculoService`, `ManutencaoService`, `MotoristaService` | `try { notificacaoClient.enviarNotificacao(…) } catch (Exception e) { log.error(…) }` (≈10 vezes) | Método `notificarSilenciosamente(tipo, dest, msg)` ou evento assíncrono (`@Async`/`ApplicationEventPublisher`) |
| `NotificacaoClient` | `enviarNotificacao` e `enviarSms` são o mesmo POST com `canal` diferente | Um único método com parâmetro `canal` |
| Todos os services | `setDataAtualizacao(LocalDateTime.now())` antes de cada `save` | `@PrePersist`/`@PreUpdate` ou `@CreatedDate`/`@LastModifiedDate` |
| Services | `setStatus("INATIVO")` / `"ATIVO"` + atualização + `save` + log em `desativar/reativar` (Veículo e Motorista) | Enums de status e um método de transição de estado nas entidades |
| `ManutencaoService` | Buscar o `Veiculo` por `veiculoId` e mudar o status, repetido em 3 métodos | `veiculoService.atualizarStatus(id, status)` |
| `EntregaClient` / `NotificacaoClient` / `HealthCheckController` | `new RestTemplate()` em 3 classes, sem timeout | Um `@Bean RestTemplate` com timeouts (ou `WebClient`) |

---

## 3. rotalog-api-notificacoes (.NET 6)

### 3.1 Problemas de arquitetura
- 🟠 **Clean Architecture abandonada no meio:** o `AddMediatR(typeof(Program))` está registrado, mas **não existe nenhum handler/request**. Pacote e registro são peso morto.
- 🟠 **God class:** `NotificacaoService` (≈370 linhas) faz CRUD, resolução de template, envio de e-mail/SMS, retry e estatística. Está registrado como classe concreta, sem interface.
- 🔴 **Violação de bounded context:** `HealthController` abre conexões diretas ao banco e consulta `frotas.veiculos` e `entregas.entregas` (trocando `SearchPath` na connection string). Acopla o schema de três serviços e expõe as contagens no response.
- 🟠 **Envio síncrono dentro da requisição** (`CriarNotificacao` → `TentarEnviar`). A falha simulada de 10%/20% (`Random`) vira erro de comportamento. Não há fila, *outbox* nem job de reprocessamento. `POST /processar` é um endpoint chamado "à mão".
- 🟠 `EnsureCreated()` no startup em vez de migrations, com `catch` que **segue rodando sem banco**.
- 🟡 O model `ConfiguracaoNotificacao` (preferências, horário silencioso) tem tabela e entidade, mas **a lógica nunca foi implementada**.
- 🟡 O `MaxTentativas` e o tamanho de lote (`Take(50)`) estão fixos no código.

### 3.2 Inconsistências de código
- 🟠 `TentarEnviar` incrementa `Tentativas` mas **`ReenviarNotificacao` não verifica o máximo** e deixa reenviar o que já foi `ENVIADO`.
- 🟡 O `Status` (`PENDENTE/ENVIADO/FALHA`) e o `Canal` (`email/sms`) são strings, com normalização diferente: `ToUpper()` no status e `ToLower()` no canal nos filtros, mas sem normalizar na gravação.
- 🟡 A validação está duplicada entre o controller (`Tipo`, `Destinatario`, `Mensagem`) e o service (`ArgumentException`).
- 🟡 `NotificacaoRequest.Mensagem` tem `string.Empty` como padrão, então "mensagem ausente" e "mensagem vazia" são indistinguíveis. Isso complica a regra `Mensagem ou Variaveis`.
- 🟡 O `launchSettings.json` fixa a porta 5000, enquanto o `Program.cs` imprime "running on port 5000" estático.
- 🟡 `Models` com anotações `[Table(Schema="notificacoes")]` **e** `HasDefaultSchema("notificacoes")` no contexto (duas fontes).

### 3.3 Vulnerabilidades de segurança
- 🔴 **Segredos em `appsettings.json` versionado:** senha do banco, `SenderPassword` e `SmsSettings:ApiKey`. O `.gitignore` tem a linha do `appsettings.json` comentada.
- 🔴 **Sem autenticação.** `UseAuthorization()` está ligado sem esquema de autenticação. Qualquer um pode `POST /api/notificacoes` (spam/phishing a partir do domínio) e `POST /processar`.
- 🔴 **Swagger exposto em todos os ambientes** (`UseSwagger` fora de `IsDevelopment`).
- 🟠 **CORS `AllowAnyOrigin`** e `AllowedHosts: "*"`.
- 🟠 **`HealthController` vaza configuração** (servidor SMTP, URL do SMS) e contagens de tabelas de outros serviços.
- 🟠 Respostas 500 incluem `ex.Message` (`detalhes`).
- 🟠 **Injeção de conteúdo no template:** `AplicarTemplate` faz `String.Replace` com valores não saneados. Em e-mail HTML isso permite injeção de HTML.
- 🟡 Sem HTTPS (`UseHttpsRedirection` comentado) e sem rate limiting. A listagem devolve notificações com e-mails de destinatários, sem escopo.
- 🟡 O corpo da mensagem é logado nos logs `[EMAIL FAKE]` (até 100 caracteres).

### 3.4 Estado de dependências
- 🔴 **.NET 6 / EF Core 6** estão fora de suporte desde nov/2024. Precisam ir para .NET 8 (LTS) ou superior.
- 🟠 `Npgsql.EntityFrameworkCore.PostgreSQL 6.0.8` e `Microsoft.EntityFrameworkCore 6.0.12` estão **desalinhados** entre si (patch diferente) e antigos.
- 🟠 **MediatR 11.1 + `MediatR.Extensions.Microsoft.DependencyInjection 11.0`**: o pacote de extensão foi descontinuado nas versões seguintes, e a lib passou a ter licença comercial a partir da v13. Como nada usa MediatR, o mais simples é *remover*.
- 🟡 `Swashbuckle.AspNetCore 6.5.0` está antigo. Falta Serilog, FluentValidation e Polly (já listados como TODO), além de `Microsoft.Extensions.Diagnostics.HealthChecks`.
- 🟡 `Nullable` está habilitado, mas há `null!`/`!` em vários pontos (`DbSet … = null!`, `connectionString!`).

### 3.5 Qualidade da infraestrutura
- 🔴 **Nenhum teste.** O `NotificacaoService` sem interface é difícil de mockar, e o envio depende de `Random`.
- 🟠 **O envio de e-mail/SMS é falso** (`Task.Delay` + falha aleatória). O serviço *parece* funcional, mas não envia nada.
- 🟠 Sem Dockerfile, CI, health checks via `IHealthCheck`, logging estruturado nem métricas.
- 🟡 `bin/` e `obj/` presentes no disco (ignorados no `.gitignore`). `Data/migration.sql` e `seed.sql` duplicam os scripts do workspace (§5.2).

### 3.6 Acessibilidade
Não se aplica (API). 🟡 Se os templates de e-mail forem HTML, precisarão de texto alternativo e contraste. Hoje são apenas texto.

### 3.7 Organização do código
- 🟡 Pastas `Controllers/Models/DTOs/Services/Data` seguem o padrão MVC clássico. Não há camada de domínio nem de aplicação (restos da "Clean Architecture").
- 🟡 O arquivo `NotificacaoRequest.cs` agrupa 4 classes DTO (request, response, reenvio e stats). Namespace `api_notificacoes` com sublinhado.
- 🟡 `Program.cs` mistura configuração, bootstrapping do banco e `Console.WriteLine` com a lista de endpoints.

### 3.8 Código repetido que poderia virar função
| Onde | O que se repete | Extrair para |
|---|---|---|
| `NotificacoesController` (7 actions) | `try { … } catch (Exception ex) { _logger.LogError; return StatusCode(500, new { error, detalhes = ex.Message }) }` | Middleware/`IExceptionHandler` (ProblemDetails) ou filtro global |
| `NotificacaoService.EnviarEmail` / `EnviarSms` | Ler config → logar → `Task.Delay` → falha aleatória | Interface `ICanalNotificacao` com duas implementações (e um provedor real depois) |
| `NotificacaoService` | `AplicarTemplate` e a busca do template ativo por `(tipo, canal)` | Um `TemplateRenderer` / `ITemplateService` |
| Controller + Service | Validação de `Tipo` e `Destinatario` | FluentValidation ou DataAnnotations em `NotificacaoRequest` |
| `HealthController` | Dois blocos quase iguais (frotas/entregas) | Removê-los (devem virar checagem de API, não de banco) |

---

## 4. rotalog-frontend (Nx: Angular + React)

### 4.1 Problemas de arquitetura
- 🔴 **Camada de dados sem abstração.** `FrotasService` e `EntregasService` usam `fetch` direto com URLs fixas (`localhost:8080`, `localhost:3000`). Não usam `HttpClient`, interceptors, `environment` nem tratamento centralizado. **Todo erro vira `[]` ou `null`**, então a UI não distingue "vazio" de "API fora do ar".
- 🔴 **Os dois apps não compartilham código.** As libs `shared-types`, `ui-components` e `api-contracts` **não são importadas por ninguém**. O `tsconfig.base.json` não define `paths`, e as libs não têm `project.json`. Cada app redefine tipos, status e componentes.
- 🟠 **Componentes God Object** no Angular: `veiculos.component.ts` (464 linhas), `dashboard.component.ts` (349), com lista + formulário + detalhe + CSS inline no mesmo arquivo. No React, `MapView.tsx` tem 324 linhas.
- 🟠 **Sem lazy loading, guards, resolvers, interceptors nem página 404** (as rotas fazem `redirectTo: dashboard`). `AppComponent` não tem autenticação.
- 🟠 **React 100% class components**, com `React.Component<any, any>`. O estado "Redux" é um campo `reduxState: null` que não faz nada: `redux` **nem está no `package.json`**, e os comentários prometem um Redux que nunca existiu.
- 🟠 **Leaflet duplicado e contornado:** `leaflet` e `react-leaflet` estão em `dependencies`, mas o `MapView` injeta o `<script>` do CDN `unpkg` e usa `declare const L: any`. O `index.html` também carrega o CSS do CDN. Os pacotes instalados não são usados.
- 🟠 **Dashboard com números fictícios:** `totalManutencoes = 6`, `manutencoesPendentes = 2` e a lista de alertas (CNH de "João Silva", datas de mar/2026) estão no código.
- 🟡 O painel ignora `api-notificacoes` por completo, e o `rastreamento` consulta `/api/entregas` (lista inteira) em vez de `/api/rastreamento`.

### 4.2 Inconsistências de código
- 🔴 🔎 **Contrato de campos incompatível com `api-frotas` (a UI de cadastro não funciona).**

  | Painel Angular usa | API real (`api-frotas`) | Efeito |
  |---|---|---|
  | `ano`, `km_atual`, `marca`, `tipo` | `anoFabricacao`, `quilometragem` (não há `marca`/`tipo`) | `POST /veiculos` falha em "Ano de fabricação inválido". O ano e o km não aparecem na tabela. |
  | `categoria_cnh`, `validade_cnh`, `cpf`, `telefone`, `email` | `categoriaCnh`, `vencimentoCnh` (não há `cpf`/`telefone`/`email`) | A validade da CNH nunca chega ao servidor. A coluna "CNH vencida" depende de um campo que a API não devolve. |
  | `Manutencao.tipo`, `data_agendada`, `oficina`, `km_na_manutencao`, `veiculo_id` | `tipoManutencao`, `dataManutencao`, `quilometragemManutencao`, `veiculoId` (não há `oficina`) | A tabela de manutenções sai com colunas vazias. |
  | `Entrega.codigo_rastreio` | `numero_pedido` | **A coluna "Código" fica em branco** em Entregas, no Dashboard e na busca. |
  | status `EM_MANUTENCAO` (veículo) | `MANUTENCAO` | O filtro e a cor do badge não funcionam. |
  | status de manutenção `AGENDADA` (CSS) | `PENDENTE` | O badge fica sem cor. |
  | placeholder de placa `ABC-1234` (8 caracteres) | a API exige 7 caracteres (`ABC1D23`) | O cadastro é recusado se o usuário seguir o exemplo. |

- 🔴 🔎 **Chamadas para endpoints inexistentes:** `DELETE /api/veiculos/{id}` (a API só tem `PATCH …/desativar`), `GET /api/manutencoes?veiculoId=` (a API usa `/manutencoes/veiculo/{id}`), `GET /api/entregas?motorista=` (a API espera `motorista_id`). O botão **"Excluir"** não faz nada no backend, mas a UI recarrega a lista como se tivesse funcionado.
- 🟠 **O mesmo conceito tem 3 definições:** `Entrega` existe em `painel-admin/models` (snake_case misto), em `libs/shared-types` (inglês: `driver_name`, `distance_km`, status em minúsculas) e no `openapi.yaml`, e nenhuma bate com a API de verdade. `StatusVeiculo.MANUTENCAO = 'EM_MANUTENCAO'` contradiz o backend.
- 🟠 O Dashboard testa `'EM_TRANSITO' || 'em_transito'` como remendo para o problema acima.
- 🟠 **`strict` desligado no React** (`strict:false`, `noImplicitAny:false`, `noUnusedLocals:false`), contra o `tsconfig.base.json` com `strict:true`. O projeto usa `any` em todo o app.
- 🟠 **Navegação com `window.location.href`** no Dashboard (recarrega a SPA inteira) em vez de `Router.navigate`. Convive com `routerLink` na sidebar.
- 🟠 **`TrackingDashboard` faz polling a cada 5 s e descarta a resposta** (só atualiza `lastUpdate`). Busca dados que não usa, mesmo sem entrega selecionada. O `.sort()` no render **muta** o array de `props`.
- 🟡 Cache manual sem invalidação em `FrotasService` (`limparCache` é chamado em vários pontos). O `EntregasService` não tem cache.
- 🟡 `ManutencoesComponent` expõe `alert()` para o template, e o botão "Nova Manutenção" é um *stub*.
- 🟡 `app.component.spec.ts` testa "Welcome painel-admin" e `title === 'painel-admin'`, mas o componente tem outro título. **O teste está quebrado.** `nx-welcome.component.ts` (808 linhas de boilerplate) é código morto.
- 🟡 `index.html` do painel usa `lang="en"` com conteúdo em português. O `rastreamento/project.json` usa o executor legado `@nx/linter:eslint`.
- 🟡 `error.log` na raiz tem só `fatal: You have nothing to amend.`

### 4.3 Vulnerabilidades de segurança
- 🔴 🔎 **XSS armazenado em `MapView.tsx` (linhas 141-158 e 207+).** `delivery.origem_endereco`, `destino_endereco` e `motorista_nome` são concatenados em string HTML e passados a `bindPopup()`. Como `POST /api/entregas` aceita endereço livre, um `<img onerror=…>` num endereço executa JS no portal **público** de rastreamento. Corrija com `textContent`/escape.
- 🔴 **Sem autenticação no painel admin** (sem login, guard nem interceptor). Combinado com o bypass da api-entregas (§1.3) e as APIs sem auth, qualquer pessoa na rede opera a frota.
- 🟠 **URLs `http://localhost:*` fixas** e CORS `*` nas três APIs. Não há CSP nem configuração por ambiente.
- 🟠 Scripts de CDN (`unpkg`) carregados em runtime. Há SRI no `<link>` e no `<script>`, o que é bom, mas aumenta a superfície e impede uso offline/CSP estrita.
- 🟡 `alert()`/`confirm()` nativos para erros e exclusão. `console.error` imprime erros completos da API.
- ✅ Bom: o Leaflet é carregado com `integrity` (SRI). O Angular escapa o template por padrão.

### 4.4 Estado de dependências
- 🔴 **Angular 18.2** já saiu do suporte (a linha ativa é bem mais nova). Plano de migração: 18 → 19 → 20 → …, com `ng update` por versão.
- 🔴 **Nx 19.8.4**, vários majors atrás. Além disso, `@nrwl/angular` e `@nrwl/react` (19.8.4) são **pacotes renomeados e descontinuados** (substituídos por `@nx/*`), e coexistem com `@nx/*` no mesmo `package.json`.
- 🟠 **Tudo está em `devDependencies`**, inclusive `react`, `react-dom` e `prop-types`, que são dependências de *runtime*. O `package.json` raiz mistura as de dois frameworks, e o app React usa Babel e o Angular usa esbuild/webpack.
- 🟠 `prettier ^2.6.2` (v2 está antigo, o Nx atual usa v3). `@types/node 18.16.9` fixo. `ts-node 10.9.1` fixo. `@playwright/test ^1.36`.
- 🟠 `react-leaflet ^4.2.1` e `leaflet` não são usados pelo código (§4.1). O `workspaces: ["packages/*"]` aponta para uma pasta vazia (`.gitkeep`).
- 🟡 `@nx/webpack`, `babel-loader`, `url-loader`, `file-loader` (`url-loader` e `file-loader` estão obsoletos desde o Webpack 5) e `style-loader` foram adicionados manualmente.
- 🟡 `CLAUDE_CONTEXT.md` descreve "Angular 14" e "React 17", mas o código real é Angular 18 e React 18.3. **A documentação está desatualizada.**

### 4.5 Qualidade da infraestrutura
- 🔴 **Praticamente sem testes:** 1 spec do Angular (quebrado) e 1 e2e de exemplo do Nx (`example.spec.ts`). Zero testes do app React e das libs.
- 🟠 Sem CI, sem `environment.ts`/`environment.prod.ts`, sem Dockerfile para servir o build e sem `scripts` no `package.json` (`"scripts": {}`).
- 🟠 Sem lint do React configurado de forma consistente, e a regra `strict` está desligada nesse app.
- 🟡 `.angular/` (cache) está no disco e `.gitignore` o lista. A lib `api-contracts/openapi.yaml` declara estar "desatualizada há 2 anos" e descreve campos que não existem.
- 🟡 `opencode.json`, `AGENTS.md` e `CLAUDE.md` de ferramentas de IA estão dentro do repositório do produto.

### 4.6 Acessibilidade
**Auditoria por busca:** não há **nenhum** `aria-*`, `role`, `alt` nem `tabindex` em `apps/` (exceto `lang`). Nenhum `:focus`/`outline` e nenhum `prefers-reduced-motion`.
- 🔴 **Linhas de tabela clicáveis e cards só com `(click)`/`onClick`**, sem `button`/`tabindex`/`keydown`: Veículos, Entregas, Dashboard (`stat-card`) e `DeliveryList`. **Inacessíveis por teclado e por leitor de tela.**
- 🔴 **Rótulos sem associação:** `<label>` sem `for`/`id` em todos os formulários (Veículos e Motoristas). Os campos obrigatórios só têm "*" no texto, sem `aria-required`, e os erros são `alert()`.
- 🟠 **Ordenação por clique em `<th>`** (Veículos) sem `button`, `aria-sort` nem indicação visual do estado.
- 🟠 **Emojis como ícones** (🚛 👤 🔧 📦 🔴 🟡 🔵) sem `aria-hidden`/texto alternativo. As severidades dos alertas são transmitidas só pela cor/emoji.
- 🟠 **Status só por cor** nos badges (verde/vermelho/laranja), sem texto adicional. Contraste não verificado: o texto `#999`/`#666` sobre `#fff`/`#f5f5f5` e os `font-size` de 10-12 px provavelmente ficam abaixo de 4.5:1.
- 🟠 **Mapa Leaflet sem alternativa textual** (o container `div` não tem rótulo, e os marcadores `divIcon` são `div` sem texto acessível). As informações de origem/destino existem só no mapa/popup, sem equivalente em texto. O painel de detalhes ajuda, mas as posições intermediárias não aparecem em lista.
- 🟠 O estado de carregamento (`Carregando…`) e as mensagens de erro não usam `role="status"`/`aria-live`, então o leitor de tela não os anuncia.
- 🟡 `lang="en"` no painel com conteúdo em pt-BR. `viewport` está presente, mas o CSS do painel diz "Sem responsividade mobile" e usa grids fixos de 3 colunas. O React só tem 1 `@media`.
- 🟡 Os modais/painéis de detalhe e o formulário inline não movem o foco ao abrir.

### 4.7 Organização do código
- 🔴 **Todos os templates e estilos estão inline** (`template: \`…\``, `styles: [\`…\`]`) em arquivos de até 464 linhas. O `app.component` é o único com `templateUrl`.
- 🟠 **Libs compartilhadas órfãs** (§4.1): 3 libs sem `project.json`, sem `paths` e sem uso.
- 🟠 `components/` mistura páginas (`dashboard`, `veiculos`), layout (`layout/`) e boilerplate (`nx-welcome`). Não há separação `pages/`, `shared/`, `core/`.
- 🟡 O `models/index.ts` mistura interfaces, um `enum` e um tipo genérico nunca usado (`ApiResponse<T>`). `getEntregasPorMotorista` não é chamado.
- 🟡 O React não tem `services/`/`api/`, e as URLs e o `fetch` estão dentro de componentes (`App.tsx`, `TrackingDashboard.tsx`).
- 🟡 O CSS global do painel ("vazando entre componentes") reseta `*` e estiliza `button`/`a`/`input` para o app todo. O `rastreamento/styles.css` tem 460 linhas globais com classes genéricas (`.sidebar`, `.loading-container`) que **colidem** com o painel se algum dia forem unificados.

### 4.8 Código repetido que poderia virar função
| Onde | O que se repete | Extrair para |
|---|---|---|
| `frotas.service.ts` / `entregas.service.ts` (≈15 métodos) | `try { fetch → !ok → json } catch { console.error; return []/null }` | Um `ApiClient` (`HttpClient` + interceptor) com `get/post/put/delete` genéricos e erro tipado |
| `veiculos` / `motoristas` / `entregas` components | Carregar → `loading` → filtrar por texto/status → formulário `mostrarFormulario/editar/cancelar/salvar`. O próprio código diz "copiado com find-replace" | Componente/diretiva base de CRUD, ou `ListFilterPipe` + `<app-crud-form>` |
| `styles` de 6 componentes | `.btn-primary`, `.data-table`, `.status-badge`, `.page-header`, `.form-grid`, `.empty-state` etc. copiados em cada `styles:[]` | Estilos globais por classe utilitária ou componentes `app-button`, `app-data-table`, `app-status-badge` |
| `STATUS_CONFIG` | Duplicado em `DeliveryList.tsx` e `TrackingDashboard.tsx` (com `FIXME`), e ainda existe em `libs/ui-components/StatusBadge` com valores diferentes | Constante única em `shared-types` + `StatusBadge` realmente usado |
| `Dashboard` / `Entregas` | Contadores por status e a tabela "últimas entregas" | `EntregasStatsService` + componente `app-entregas-table` |
| `MapView.tsx` | Dois `L.divIcon` quase idênticos (origem/destino) e a construção do popup por concatenação | `criarIcone(cor, emoji)` e `renderPopup()` com escape |
| `fetch('http://localhost:3000/api/entregas…')` | Aparece em `App.tsx` e em `TrackingDashboard.tsx` | `rastreamentoApi.ts` com `API_URL` vindo de config |

---

## 5. rotalog-workspace (Docker + SQL)

### 5.1 Problemas de arquitetura
- 🟠 **Banco compartilhado por três serviços** (um Postgres, 3 schemas, **um único usuário `rotalog_admin` com `ALL PRIVILEGES`** em todos). Isso permite o acesso entre schemas que o `HealthController` explora e que o `init-schemas.sql` descreve como "intencional".
- 🟠 **O orquestrador não orquestra:** o compose sobe *só o Postgres*. APIs e frontends são iniciados à mão em 4 terminais (README e `CLAUDE_CONTEXT.md`).
- 🟠 **O schema e os dados de seed são propriedade do workspace**, não dos serviços. Cada serviço depende de scripts de outro repositório para existir (§5.2).
- 🟡 Dados denormalizados são "corrigidos" por um script de backfill (`08-add-motorista-veiculo-info.sql`) com nomes e modelos *fixos*. É um acoplamento entre os seeds de frotas e de entregas.

### 5.2 Inconsistências de código
- 🟠 🔎 **O schema está definido em 4 lugares que podem divergir:**
  1. `tools/scripts/02..04-migration-*.sql` (os usados pelo compose),
  2. `rotalog-api-entregas/src/config/migration.sql`,
  3. `rotalog-api-frotas/.../db/migration/V1__Initial_Schema.sql` (Flyway **desligado**),
  4. `rotalog-api-notificacoes/Data/migration.sql`,

  além de `sequelize.sync()` e `EnsureCreated()` nos serviços Node e .NET. Seeds também são duplicados (`seed.sql`, `populate.sql`, `V2__Seed_Data.sql`, `05..07`).
- 🟠 O script `08` se descreve como "idempotente" (as colunas já existem no `03`), mas o **`UPDATE … WHERE … IS NULL` é a única parte útil**. A migração é redundante com o `03`.
- 🟡 Os scripts numerados `01..08` dependem da ordem alfabética do `docker-entrypoint-initdb.d`. Cada um está montado individualmente no compose (8 linhas de volume).
- 🟡 Dados de seed misturam o campo `status` em maiúsculas (padrão) com valores que as UIs não conhecem (§4.2).

### 5.3 Vulnerabilidades de segurança
- 🔴 **Senha em texto puro no `docker-compose.yml`** (`POSTGRES_PASSWORD`), repetida no `.env`, no `application.properties` e no `appsettings.json`. O `.gitignore` do workspace ignora `.env`, mas os repositórios dos serviços não.
- 🟠 **Porta 5432 publicada em `0.0.0.0`** com usuário administrador (`ports: "5432:5432"`). Use `127.0.0.1:5432:5432`.
- 🟠 Um único superusuário para tudo: sem papéis por schema, sem RLS e sem auditoria (todos como `TODO` no `init-schemas.sql`).
- 🟡 Imagem `postgres:14` sem pin de patch/digest. O Postgres 14 tem fim de suporte previsto para nov/2026, então **conferir a data**.

### 5.4 Estado de dependências
- 🟠 `postgres:14` está próximo do fim de vida (a data de fim do suporte do PG14 é nov/2026, então verificar o estado atual). O atributo `version: '3.8'` do compose é obsoleto e ignorado pelo Compose v2 (gera *warning*).
- 🟡 As versões dos clientes (driver `pg` 8, Npgsql 6, JDBC 42.5.1) não estão alinhadas com a versão do servidor.

### 5.5 Qualidade da infraestrutura
- 🔴 **Sem healthcheck** no container do Postgres (há `TODO`/`FIXME`), então qualquer serviço que subir junto pode tentar conectar antes de o banco aceitar conexões. **Sem limites de recursos, sem backup, sem `restart` policy.**
- 🔴 **Serviços fantasma:** Redis, Kafka, Elasticsearch, Prometheus e Grafana estão comentados como `TODO` e "nunca foram implementados". Isso é ruído, não infraestrutura.
- 🟠 **Os seeds rodam somente no primeiro start** (volume vazio). Uma mudança nos scripts exige `docker-compose down -v` e **apaga os dados**. Não há processo de migração evolutiva (Flyway/Liquibase/EF/Sequelize migrations).
- 🟠 Sem `Dockerfile` por serviço, sem CI/CD, sem `.env.example` e sem orquestração de rede entre serviços e banco (a rede `rotalog-network` só tem o Postgres).
- 🟡 `README.md` do workspace e `CLAUDE_CONTEXT.md` divergem (versões de Angular/React, MediatR "com handlers gigantes" que não existem, "21 endpoints"…).

### 5.6 Acessibilidade
Não se aplica.

### 5.7 Organização do código
- 🟠 `tools/scripts/` mistura DDL, seeds e uma migração, diferenciados só pelo prefixo numérico. Faltam subpastas (`schema/`, `seed/`) e um `Makefile`/script de bootstrap (`make up`).
- 🟡 `CLAUDE_CONTEXT.md` (histórico de criação do projeto) vive na raiz com o `README.md` e mistura documentação do produto com instruções para IA.
- 🟡 O `.gitignore` do workspace ignora `package-lock.json` e `*.jar`, mas o workspace não tem código Node nem Java. É um modelo copiado dos outros repositórios (o `package-lock.json` ignorado é um problema real na api-entregas, §1.4).

### 5.8 Código repetido que poderia virar função
- 🟡 Os `UPDATE entregas SET motorista_nome = '…' WHERE motorista_id = N` (6×) e `UPDATE … veiculo_modelo` (7×) do script `08` poderiam ser um único `UPDATE … FROM (VALUES …)` ou, melhor, vir direto no seed.
- 🟡 Os blocos de `CREATE TABLE IF NOT EXISTS` e seeds repetidos nos 4 locais (§5.2) são a principal duplicação do workspace: escolha *uma* fonte de verdade.

---

## Dívidas transversais (entre projetos)

| # | Problema | Projetos | Sugestão |
|---|---|---|---|
| T1 | **Nenhum contrato compartilhado.** O OpenAPI do front está desatualizado e não é usado, e cada serviço usa um estilo de nomes (Java camelCase, Node snake_case, .NET PascalCase/camel). | frotas, entregas, notificacoes, frontend | Um OpenAPI por serviço, gerado do código (springdoc / swagger-jsdoc / Swashbuckle) e consumido para gerar o cliente do front |
| T2 | **Autenticação inexistente ou de fachada** em todos os pontos de entrada. | todos | Decidir um IdP/JWT único e validá-lo em cada API |
| T3 | **Segredos versionados** em 4 repositórios. | todos | `.env.example`, variáveis de ambiente/secret manager e rotação das senhas atuais (consideradas comprometidas) |
| T4 | **Resiliência HTTP zero** (sem timeout, retry nem circuit breaker) nas 3 integrações (Node→Java, Java→Node, Java→.NET). | entregas, frotas | Timeout + retry com backoff (Polly / Resilience4j / `AbortController`) |
| T5 | **Status como string** em 4 linguagens, com grafias diferentes (`EM_TRANSITO`, `em_transito`, `EM_MANUTENCAO`, `MANUTENCAO`). | todos | Enums por serviço e um dicionário de status no contrato |
| T6 | **Observabilidade ausente:** logs não estruturados, sem correlação, sem métricas e health checks que não verificam nada. | todos | Logs JSON com `traceId` propagado, `/health` real e métricas básicas |
| T7 | **Quase nenhuma cobertura de teste** (só 2 specs de exemplo, uma delas quebrada). | todos | Começar por testes de contrato nas 3 integrações e dos fluxos de status |

---

## Sugestão de ordem de ataque

1. **Corrija o que está quebrado hoje (baixo esforço, alto valor):** o contrato de campos do painel × `api-frotas` (§4.2), o `DELETE` inexistente, `codigo_rastreio`, o caso do status em `EntregaClient` (§2.2) e a conexão do `notificacaoService` (§1.1).
2. **Feche as brechas de segurança:** autenticação real, XSS do `MapView`, rotação de segredos e retirada dos arquivos de config do controle de versão.
3. **Estabilize a base:** um único lugar para o schema (e ligar o Flyway), healthcheck no compose, `@RestControllerAdvice`/`asyncHandler`/`IExceptionHandler` e timeouts nas integrações.
4. **Atualize os runtimes** (Node, .NET, Spring Boot/Java e Angular/Nx), de um projeto por vez e com testes de caracterização antes.
5. **Reorganize o front:** `HttpClient` + `environment`, quebrar os God components, adotar de fato as libs compartilhadas e tratar a acessibilidade por teclado.

> **Limitações desta análise:** não executei nada, e as afirmações sobre fim de suporte de Node 18, .NET 6, Spring Boot 2.7, Angular 18, Postgres 14 e CVEs vêm do meu conhecimento dos calendários de suporte, então confirme nas páginas oficiais antes de priorizar. Não li o conteúdo das pastas `target/`, `bin/`, `obj/`, `.angular/` nem de `node_modules/`, nem os seeds SQL completos. Também não li `nx-welcome.component.ts`, `styles.css` do React nem as folhas de CSS inline por inteiro.
