# ADR 0001 — Refatoração do `VeiculoService`

- **Status:** Proposto
- **Data:** 2026-11-08
- **Escopo:** `rotalog-api-frotas` — [VeiculoService.java](../../src/main/java/com/rotalog/service/VeiculoService.java)
- **Base:** [MAPA_DIVIDAS_TECNICAS.md](../../../rotalog-workspace/MAPA_DIVIDAS_TECNICAS.md) §2.1, §2.2, §2.5, §2.7, §2.8 e T5
 
## Contexto

O `VeiculoService` tem 339 linhas e concentra validação, regras de negócio, notificação a outro serviço, estatística e métodos sem uso. Por ser dívida técnica intencional do projeto, nada foi alterado até agora. Esta ADR registra os problemas encontrados e a direção da refatoração. **Ela não altera código.**

## Problemas identificados

### 1. Classe grande, com muitas responsabilidades
Um único service faz:
- CRUD e consultas (`listarTodos`, `buscarPorId`, `buscarPorPlaca`);
- validação (`registrarVeiculo`);
- regra de manutenção preventiva (`precisaDeManutencao`, `agendarManutencaoPreventiva`, `calcularCustoManutencao`);
- notificação (try/catch repetido em `registrarVeiculo`, `atualizarQuilometragem`, `agendarManutencaoPreventiva` e `desativarVeiculo`);
- estatística (`obterEstatisticasFreita`);
- um "sincronizar" vazio (`sincronizarComSistemaExterno`).

Há regras com valor fixo: `50000L` km, `10000L`, `0.05` e `500.0`. O destinatário `gestor@rotalog.com` está repetido 4 vezes. A injeção é por `@Autowired` em campo, o que dificulta o teste.

### 2. Exceções genéricas
Todo erro é `new RuntimeException(...)`: veículo não encontrado, placa duplicada, placa/modelo/ano inválidos, km negativo e status inválido (8 pontos). O controller só consegue capturar `RuntimeException`, então o status HTTP depende do método (um "não encontrado" vira 400 em `PUT`/`PATCH` e 404 em `GET`). O cliente também recebe `e.getMessage()` direto.

### 3. Sem testes
Não existe `src/test`, embora `spring-boot-starter-test` esteja no `pom.xml`. Nenhuma regra do service tem proteção contra regressão, o que dificulta qualquer refatoração.

### 4. Javadoc em excesso
Os blocos de Javadoc repetem o nome do método ("Busca veículo por ID", "Reativa veículo") ou carregam listas de `FIXME`/`TODO`. Isso aumenta o ruído, e os `TODO` do final do arquivo (metrics, caching, audit trail…) duplicam o MAPA de dívidas.

### 5. `System.out.println`
Aparece em 3 lugares, misturado ao `@Slf4j`:
- `registrarVeiculo`, no `catch` da notificação;
- `atualizarQuilometragem`, no aviso de km menor;
- `sincronizarComSistemaExterno`.

### 6. Status como `String`
`"ATIVO"`, `"INATIVO"` e `"MANUTENCAO"` estão espalhados pelo service. `obterVeiculosPorStatus` valida com uma cadeia de `equals`. Um erro de digitação só aparece em runtime (T5 do mapa).

### 7. Código e variáveis sem uso
- `agendarManutencaoPreventiva`: `intervaloQuilometragem` e `intervaloMeses` são declarados e nunca usados. O método também não agenda nada, só loga e notifica.
- `calcularCustoManutencao` e `sincronizarComSistemaExterno` não têm chamadores. Os dois só são referenciados pela própria classe (conferido por busca no módulo).
- `agendarManutencaoPreventiva` também não é chamado pelo `VeiculoController`.

### 8. Outros riscos encontrados na leitura
| Ponto | Risco |
|---|---|
| Sem `@Transactional` | Operações de leitura-e-gravação sem fronteira transacional explícita. |
| `precisaDeManutencao(id)` | Chama `buscarPorId` de novo logo após o `save`, gerando uma consulta extra por atualização de km. |
| `atualizarVeiculo` × `atualizarQuilometragem` | Regras contraditórias para km menor: um só faz `log.warn`, o outro usa `println`, e ambos gravam o valor menor. |
| `registrarVeiculo` | Checa duplicidade com `findByPlaca(placa)` **antes** de `toUpperCase()`. `abc1d23` e `ABC1D23` passam como placas diferentes. Também ignora a quilometragem recebida (força `0L`). |
| `obterVeiculosPorStatus` | `status.equals(...)` lança `NullPointerException` se `status` for `null`. |
| `atualizarQuilometragem` | `novaQuilometragem < 0` lança NPE se vier `null`. |
| `obterEstatisticasFreita` | Typo no nome, JSON montado com `String.format` e `findByStatus(...).size()` em vez de `count`. |
| Notificação | É síncrona, sem timeout, dentro do fluxo de negócio. A falha é engolida com `catch (Exception)`. |

## Decisão

Refatorar em fases, mantendo o comportamento externo, exceto onde indicado.

### D1. Dividir responsabilidades
| Classe | Responsabilidade |
|---|---|
| `VeiculoService` | Só CRUD, consulta e mudança de estado. |
| `VeiculoValidator` | Regras de placa, modelo, ano e quilometragem. |
| `VeiculoNotificador` | Centraliza o try/catch e o destinatário (configurável). Substitui as 4 cópias. |
| `VeiculoEstatisticaService` | Estatística da frota via `countByStatus`, retornando um DTO (`EstatisticaFrotaResponse`) em vez de `String`. |
| `ManutencaoPreventivaPolicy` | Limite de km da manutenção preventiva, vindo de configuração. |

Os métodos sem uso (`calcularCustoManutencao`, `sincronizarComSistemaExterno`, `agendarManutencaoPreventiva`) serão removidos, junto com as variáveis não usadas.
O nome `obterEstatisticasFreita` será corrigido ao mover o método. Esse typo já está catalogado no mapa e hoje só o controller o chama.

### D2. Enum de status
Criar `StatusVeiculo { ATIVO, INATIVO, MANUTENCAO }` e mapear com `@Enumerated(EnumType.STRING)` em `Veiculo`. O banco já guarda texto, então **nenhum SQL em `rotalog-workspace/tools/scripts/` precisa mudar** e o `ddl-auto=validate` continua passando. O enum terá `StatusVeiculo.from(String)`, que lança exceção específica para o filtro da rota `/veiculos/status/{status}`. O JSON continua com as mesmas strings.

### D3. Exceções específicas
Criar o pacote `com.rotalog.exception`, com uma base `RegraNegocioException` e:
- `VeiculoNaoEncontradoException` → 404;
- `PlacaDuplicadaException` → 409;
- `DadosVeiculoInvalidosException` → 400 (placa, modelo, ano, km e status inválidos).

Um `@RestControllerAdvice` faz o mapeamento, e os `catch (RuntimeException)` do `VeiculoController` deixam de ser necessários.

> ⚠️ **Muda o contrato de rota.** Hoje vários erros respondem 400. Entregas, notificações e os frontends consomem esta API, então a mudança deve ser avisada e verificada antes do merge. Mantenha o corpo `{"erro": "..."}` para não quebrar os consumidores.

### D4. Logs e Javadoc
- Remover todo `System.out.println` e usar apenas SLF4J.
- Manter Javadoc só onde existir regra não óbvia (por exemplo, a regra de km menor). Remover os blocos redundantes e os `TODO`/`FIXME` que forem resolvidos.

### D5. Testes unitários
JUnit 5 + Mockito (`@ExtendWith(MockitoExtension.class)`), em `src/test/java/com/rotalog/service/`. Casos mínimos:
- **registrarVeiculo:** sucesso; placa nula/vazia/com tamanho errado; placa duplicada (inclusive caixa diferente); modelo vazio; ano inválido; falha da notificação não impede o cadastro.
- **buscarPorId / buscarPorPlaca:** encontrado e não encontrado.
- **atualizarVeiculo:** campos parciais; km menor.
- **atualizarQuilometragem:** negativa, nula, menor que a atual, e notificação ao atingir o limite.
- **obterVeiculosPorStatus:** válido, inválido e nulo.
- **desativar / reativar:** mudança de status e notificação.
- **Estatística:** totais corretos.

Meta sugerida: ≥ 80% de cobertura de linhas no service e no validator. A pasta `src/test` só será criada quando esta ADR for implementada.

### D6. Injeção por construtor
`@RequiredArgsConstructor` com campos `final` nas classes novas e no `VeiculoService`, para permitir `@InjectMocks` e mocks limpos.

## Alternativas consideradas

| Alternativa | Motivo da rejeição / adiamento |
|---|---|
| Só limpar a classe (logs, Javadoc, código morto) | Não reduz as responsabilidades nem resolve as exceções. Vira a **fase 1** deste plano, não a solução completa. |
| Status como `String` + constantes | Sem verificação em compilação, e o filtro da rota continua frágil. |
| Bean Validation (`@Valid`) nos DTOs agora | O `spring-boot-starter-validation` já está no `pom.xml`, mas migrar a validação muda o contrato dos DTOs e envolve os 3 services. **Adiado**. |
| Notificação assíncrona (`@Async`/eventos) | Resolve o acoplamento síncrono, porém é escopo maior (§2.1). A `VeiculoNotificador` já deixa o ponto isolado para essa troca. |

## Consequências

**Positivas**
- Service menor, testável e com uma razão para mudar.
- Erros HTTP consistentes e tipados.
- Cobertura de teste onde hoje há zero.
- Typos de status deixam de compilar.

**Negativas / riscos**
- Mais classes no módulo.
- Mudança nos códigos HTTP (D3) exige comunicação com os consumidores.
- Remover métodos públicos sem uso é seguro dentro do módulo, mas confirme que nenhum outro repositório depende deles (eles não são rotas).

**Não muda**
- `Veiculo` continua com `TABLE_PER_CLASS` e o Flyway segue desabilitado. Ambos são dívida intencional fora deste escopo.
- `ManutencaoService` e `MotoristaService` não são alterados aqui. Eles têm o mesmo padrão de try/catch e podem reaproveitar o `Notificador` em outra ADR.

## Plano de implementação

Cada fase deve ser um PR/commit independente.

1. **Testes de caracterização** do comportamento atual (protegem as fases seguintes).
2. **Limpeza:** remover `System.out.println`, Javadoc redundante, código morto e variáveis não usadas.
3. **Enum `StatusVeiculo`** e ajuste de `Veiculo`, `VeiculoRepository` e do `VeiculoController` (filtro por status).
4. **Exceções específicas** + `@RestControllerAdvice` (avisar os consumidores).
5. **Extração:** `VeiculoValidator`, `VeiculoNotificador`, `VeiculoEstatisticaService`, `ManutencaoPreventivaPolicy`, e injeção por construtor.
6. **Correções de comportamento** descobertas (normalizar a placa antes da checagem de duplicidade, tratar `null`, decidir a regra de km menor) com seus testes. Cada correção deve ser aprovada, porque altera comportamento.

## Verificação (quando for implementar)
- `./mvnw -q compile` e `./mvnw test` verdes. Obs.: o mapa (§2.4) informa que o `mvnw` **não existe** no projeto, então use `mvn` até ele ser adicionado.
- Subir a API com o Postgres (`docker-compose up -d postgres`) e exercitar `/api/veiculos` (GET, POST, PATCH, estatísticas).
- Conferir que o JSON de resposta dos veículos manteve `status` como texto.
