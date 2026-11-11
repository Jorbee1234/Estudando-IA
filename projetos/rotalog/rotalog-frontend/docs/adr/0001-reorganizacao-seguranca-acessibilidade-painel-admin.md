# ADR 0001 — Reorganização, segurança, acessibilidade e testes do `painel-admin` (Angular)

- **Status:** Proposto
- **Data:** 2026-11-08
- **Escopo:** `rotalog-frontend` — [apps/painel-admin/src/](../../apps/painel-admin/src/)
- **Base:** [MAPA_DIVIDAS_TECNICAS.md](../../../rotalog-workspace/MAPA_DIVIDAS_TECNICAS.md) §4.1, §4.2, §4.3, §4.5, §4.6, §4.7, §4.8, T1, T2, T5, T6 e T7
- **Práticas modernas:** [angular.dev](https://angular.dev). O que depende de versão está separado no D9b e **deve ser confirmado na documentação oficial antes de implementar** (a pesquisa que originou o D9 usou fontes secundárias).
- **Fora do escopo:** o app `rastreamento` (React) terá ADR própria, incluindo o XSS do `MapView`.

## Contexto

O `painel-admin` tem 2133 linhas de TypeScript em 6 componentes e 2 services (sem contar o `nx-welcome.component.ts`, com 808 linhas). Só o `app.component` usa `templateUrl`: as demais páginas guardam template e CSS dentro do `.ts`. Os services usam `fetch` direto, engolem todo erro e falam com campos que não existem nas APIs. Por ser dívida técnica intencional do projeto, nada foi alterado até agora. Esta ADR registra os problemas encontrados e a direção da refatoração. **Ela não altera código.**

Os temas tratados são: separação dos estilos em classes, camada de requisições, enums de status, segurança, acessibilidade, comentários, testes e práticas modernas do Angular (D9).

> **Sobre o estilo local.** O `CLAUDE.md` do projeto manda não corrigir dívida técnica proativamente e seguir o estilo do módulo. Tudo o que está aqui só vale porque a refatoração foi pedida, e deve ser feito na fase indicada, não de passagem em outras mudanças.

> **Medições.** Os números vêm de leitura e contagem por busca no código. Não rodei build, Jest, Playwright nem ferramenta de contraste. Itens marcados como *estimativa* precisam ser confirmados na implementação.

## Problemas identificados

### 1. Estilos e templates inline, com classes duplicadas
Os 5 componentes de página e a sidebar guardam template (568 linhas somadas) e estilos (492 linhas somadas) dentro do `.ts`:

| Componente | Linhas totais | Template inline | Styles inline |
|---|---|---|---|
| [veiculos.component.ts](../../apps/painel-admin/src/app/components/veiculos/veiculos.component.ts) | 464 | 146 | 194 |
| [dashboard.component.ts](../../apps/painel-admin/src/app/components/dashboard/dashboard.component.ts) | 349 | 99 | 148 |
| [motoristas.component.ts](../../apps/painel-admin/src/app/components/motoristas/motoristas.component.ts) | 251 | 119 | 32 |
| [entregas.component.ts](../../apps/painel-admin/src/app/components/entregas/entregas.component.ts) | 203 | 113 | 33 |
| [sidebar.component.ts](../../apps/painel-admin/src/app/components/layout/sidebar.component.ts) | 131 | 45 | 70 |
| [manutencoes.component.ts](../../apps/painel-admin/src/app/components/manutencoes/manutencoes.component.ts) | 97 | 46 | 15 |

Classes redeclaradas em cada componente:

| Classe | Componentes |
|---|---|
| `.data-table`, `.status-badge`, `.loading` | 5 (veículos, motoristas, entregas, manutenções, dashboard) |
| `.page-header`, `.empty-state` | 4 |
| `.btn-primary`, `.filters` | 3 |
| `.btn-secondary`, `.btn-edit`, `.form-*` | 2 (veículos, motoristas) |
| `.detail-*`, `.btn-close` | 2 (veículos, entregas) |

Valores repetidos à mão: `box-shadow: 0 2px 8px` ×15, `border-radius: 12px` ×19, `#333` ×19, `#999` ×12, `#666` ×12. Não há variáveis CSS. As variantes `.status-*` são redeclaradas por componente (e, no dashboard, duplicadas em maiúsculas e minúsculas). O [styles.css](../../apps/painel-admin/src/styles.css) global (49 linhas) tem um reset `*` agressivo e nenhum `:focus`. O orçamento `anyComponentStyle` do [project.json](../../apps/painel-admin/project.json) (aviso em 2 kb, erro em 4 kb) provavelmente é estourado pelo CSS do `veiculos.component.ts` (*estimativa*).

### 2. Requisições misturadas, sem tratamento de erro
[frotas.service.ts](../../apps/painel-admin/src/app/services/frotas.service.ts) (194 linhas) e [entregas.service.ts](../../apps/painel-admin/src/app/services/entregas.service.ts) (49 linhas):

| Ponto | Situação |
|---|---|
| Cliente HTTP | 14 chamadas `fetch`. `HttpClient`, interceptors e `environment` não existem; `app.config.ts` não registra `provideHttpClient`. |
| URLs | `http://localhost:8080` ([frotas.service.ts:8](../../apps/painel-admin/src/app/services/frotas.service.ts#L8)) e `http://localhost:3000` ([entregas.service.ts:6](../../apps/painel-admin/src/app/services/entregas.service.ts#L6)) fixas. |
| Erros | 14 `try/catch` com `console.error` que devolvem `[]` (6), `null` (7) ou `false` (1). A UI não distingue "vazio" de "API fora do ar". |
| Efeito na tela | `salvarVeiculo` ignora o `null` e fecha o formulário como se tivesse salvado ([veiculos.component.ts:445-453](../../apps/painel-admin/src/app/components/veiculos/veiculos.component.ts#L445-L453)); `confirmarExclusao` ignora o booleano de `deletarVeiculo` (458-461). O `try/catch` do dashboard (312-342) nunca dispara por falha de rede. |
| Cache | Manual, dois campos, zerado em 8 pontos. `getManutencoes` e entregas não têm cache. |
| Sem chamador | `getEntregasPorMotorista`, `getManutencoesPorVeiculo`, `getVeiculo`, `getMotorista`, `getEntrega`. |

Chamadas para endpoints que **não existem** na API (MAPA §4.2):

| Chamada do painel | API real |
|---|---|
| `DELETE /api/veiculos/{id}` | só `PATCH /veiculos/{id}/desativar` e `/reativar` |
| `GET /api/manutencoes?veiculoId=` | `GET /manutencoes/veiculo/{veiculoId}` |
| `GET /api/entregas?motorista=` | a API lê `motorista_id` |

O botão "Excluir" não faz nada no backend, mas a lista é recarregada como se tivesse funcionado.

### 3. Status como `String` solta
Há **62 literais de status** espalhados por 6 arquivos, nenhum centralizado. O enum `StatusVeiculo` de [models/index.ts](../../apps/painel-admin/src/app/models/index.ts) não é importado por ninguém. Divergências com a API:

| Painel | API | Efeito |
|---|---|---|
| `EM_MANUTENCAO` (veículo) | `MANUTENCAO` | filtro e cor do badge não funcionam |
| `AGENDADA` (manutenção) | `PENDENTE` | badge sem cor |
| `AFASTADO` (motorista) | não existe (`ATIVO`, `INATIVO`, `FERIAS`) | opção morta |
| `EM_TRANSITO` e `em_transito` | `EM_TRANSITO` | remendo em [dashboard.component.ts:328](../../apps/painel-admin/src/app/components/dashboard/dashboard.component.ts#L328) e CSS duplicado (262-265) |

Além disso, `veiculosInativos` é `status !== 'ATIVO'` e conta veículos em manutenção como inativos ([dashboard.component.ts:321](../../apps/painel-admin/src/app/components/dashboard/dashboard.component.ts#L321)). `totalManutencoes = 6` e `manutencoesPendentes = 2` são valores fixos (332-333). Os badges mostram o texto cru da API (`EM_MANUTENCAO`).

### 4. Contrato de campos incompatível com as APIs
Confirmado contra os DTOs da api-frotas e o model da api-entregas (detalhes no MAPA §4.2):

| Painel usa | API | Observação |
|---|---|---|
| `ano`, `km_atual` | `anoFabricacao`, `quilometragem` | `POST /veiculos` falha em "Ano de fabricação inválido" |
| `marca`, `tipo`, `ultima_manutencao`, `motorista_id` | não existem | |
| `categoria_cnh`, `validade_cnh` | `categoriaCnh`, `vencimentoCnh` | a validade nunca chega ao servidor |
| `cpf`, `telefone`, `email`, `data_admissao`, `veiculo_id` | não existem | |
| `tipo`, `data_agendada`, `km_na_manutencao`, `veiculo_id`, `oficina` | `tipoManutencao`, `dataManutencao`, `quilometragemManutencao`, `veiculoId` (sem `oficina`) | |
| `codigo_rastreio` | `numero_pedido` | a coluna "Código" fica em branco |

`Entrega` tem 3 definições (painel, [libs/shared-types](../../libs/shared-types/src/index.ts) e [openapi.yaml](../../libs/api-contracts/src/openapi.yaml)) e nenhuma bate com a API. **Correção de redação do MAPA §4.2:** no painel os models são só `snake_case`; a mistura de estilos é entre o painel (`snake_case`) e as APIs (Java `camelCase`, Node `snake_case`). O placeholder de placa `ABC-1234` (8 caracteres) também é recusado pela API (7 caracteres).

### 5. Segurança
| Ponto | Situação |
|---|---|
| Autenticação | Inexistente: sem login, guard nem interceptor. A api-entregas exige `Authorization` em `/api/entregas` ([index.js:75](../../../rotalog-api-entregas/src/index.js#L75)) e o painel não envia nenhum cabeçalho, então a tela de entregas depende do `[]` silencioso (*por leitura, não exercitado*). |
| Headers/CSP | [index.html](../../apps/painel-admin/src/index.html) sem CSP; `lang="en"` com conteúdo em português. |
| Erros | Todo erro vira `console.error` (16 chamadas `console.*`: 14 nos services, 1 no dashboard, 1 no `main.ts`). Erros de usuário via `alert()` (3 pontos) e `confirm()` (1). |
| Navegação | `window.location.href` em 5 `(click)` do dashboard ([dashboard.component.ts:347](../../apps/painel-admin/src/app/components/dashboard/dashboard.component.ts#L347)): recarrega a SPA e perde o cache dos services. |
| Configuração | URLs `localhost` fixas; sem `environment`; `package-lock.json` e `engines` a verificar. |
| XSS | **Risco baixo hoje:** 0 ocorrências de `innerHTML`, `[innerHTML]` e `bypassSecurityTrust*` em `src/`; o Angular escapa as interpolações. Vale travar isso por lint para não regredir. |
| `nx-welcome` | Template com `<style>` global (808 linhas, 28 links externos) e sem uso fora do spec. |

O XSS armazenado do portal de rastreamento (MAPA §4.3) é do app React e fica na outra ADR.

### 6. Acessibilidade
Auditoria por busca em `src/` (exceto `nx-welcome`): **0 ocorrências** de `aria-*`, `role`, `tabindex`, `:focus` e `aria-live`.

| Problema | Medição |
|---|---|
| `(click)` em elemento não interativo, sem teclado | 11: 4 `div.stat-card` e 1 `tr` no dashboard, 1 `tr` em entregas, 1 `tr` e 4 `th` (ordenação) em veículos |
| `<label>` sem `for`/`id` | 27 de 27: 15 de formulário (veículos 7, motoristas 8) e 12 `label` sobre `span` nos painéis de detalhe |
| Campos obrigatórios | só "*" no texto, sem `aria-required`; erros por `alert()` |
| Tabelas | sem `<caption>`, `<th>` sem `scope`, ordenação sem `button` nem `aria-sort` |
| Ícones | emojis (📊 🚛 👤 🔧 📦 e 🔴 🟡 🔵) sem `aria-hidden`; severidade dos alertas só por cor/emoji; `✕` sem `aria-label` |
| Status | só cor + texto cru da API |
| Loading/erro | `.loading` e `.error-banner` são `div` sem `role="status"`/`role="alert"` |
| Contraste (*estimativa*) | `#999` sobre branco ≈ 2,8:1 (`.btn-close`, `.empty-state`, `.mini-label`, `.detail-item label`, `.alert-date`); `#666` sobre `#1a1a2e` no rodapé da sidebar ≈ 3:1; `#f57f17` sobre branco. Validar com ferramenta antes de fechar. |
| Tipografia | todos os `font-size` em `px`; `.badge-danger` com 10 px; 14 usos de 12 px |
| Responsividade | sidebar `fixed` com 250 px e `margin-left: 250px`; grids de 3-4 colunas fixos; nenhum `@media` |
| Foco | o reset `*` e a falta de `:focus` deixam o foco sem destaque confiável; modais/painéis de detalhe não movem o foco |
| Idioma | `lang="en"` (§5) |

### 7. Organização, comentários e testes
- **Arquitetura:** rotas sem lazy loading, guard, resolver nem página 404 (`**` redireciona para `dashboard`); nenhum componente usa `OnPush`, signals ou `trackBy`. [app.config.ts](../../apps/painel-admin/src/app/app.config.ts) só tem `provideZoneChangeDetection` e `provideRouter`. As 3 libs (`shared-types`, `ui-components`, `api-contracts`) não têm `project.json` nem `paths` e ninguém as importa.
- **Pastas:** `components/` mistura páginas, layout e boilerplate; não há `core/`, `shared/` nem `features/`. As páginas Veículos, Motoristas e Entregas repetem o ciclo carregar → filtrar → formulário ("copiado com find-replace").
- **Código morto:** `nx-welcome.component.ts` (808 linhas), `ApiResponse<T>`, o enum `StatusVeiculo`, os 5 métodos sem chamador e o `error.log` da raiz.
- **Comentários:** **79 linhas `TODO`** no painel (100 contando as libs), 0 `FIXME`; só ~62 linhas de comentário em 2133 de TS (~3%, quase todos `TODO`). Vários repetem o que o MAPA já diz ("Componente God Object", "URL hardcoded", "Sem lazy loading"). Não é um problema de volume de texto, é de ruído e duplicação do MAPA.

  | Arquivo | `TODO` |
  |---|---|
  | `dashboard.component.ts` | 15 |
  | `veiculos.component.ts` | 11 |
  | `frotas.service.ts` | 10 |
  | `models/index.ts` | 8 |
  | `entregas.component.ts` | 6 |
  | `motoristas.component.ts`, `styles.css` | 5 cada |
  | demais (7 arquivos) | 19 |

- **Testes:** `scripts` do `package.json` vazio. Existe 1 spec ([app.component.spec.ts](../../apps/painel-admin/src/app/app.component.spec.ts), 2 testes) e 1 e2e de exemplo ([example.spec.ts](../../apps/painel-admin-e2e/src/example.spec.ts)). Por leitura, os três casos **falham**: o spec espera `h1` "Welcome painel-admin" e `title === 'painel-admin'` (o título real é `'RotaLog - Painel Administrativo'`), e o e2e espera "Welcome". O Jest não foi executado. Sem teste de service, mapper nem componente. O ESLint está ligado com preset Angular, mas sem regras de acessibilidade de template além do preset, e `depConstraints` `*` → `*`.

### 8. Contratos que a refatoração precisa preservar
| Contrato | Observação |
|---|---|
| Rotas do painel | `/dashboard`, `/veiculos`, `/motoristas`, `/manutencoes`, `/entregas` e o redirect da raiz. |
| APIs | Não mudam. O painel se adapta a elas (mappers), e não o contrário. |
| Status vindos do back | Os valores reais de cada API (`MANUTENCAO`, `PENDENTE`, `EM_TRANSITO`…) são a fonte de verdade. |
| Chamadas existentes | `/api/veiculos`, `/api/motoristas`, `/api/manutencoes` (api-frotas, `context-path=/api`) e `/api/entregas` (api-entregas). |

### 9. Práticas atuais do Angular ausentes
O painel está em **Angular 18.2**. Hoje ele é standalone, mas não usa o que o mercado adota como padrão nas versões recentes:

| Prática atual | Situação no painel |
|---|---|
| Signals para estado local | 0 componentes usam signals |
| `ChangeDetectionStrategy.OnPush` | 0 componentes |
| Control flow (`@if`/`@for` com `track`) | templates com `*ngFor` sem `trackBy` (vários); o control flow novo não é usado (*por leitura*) |
| `inject()`, `input()`/`output()` | não usados (*estimativa*: não conferi todos os componentes) |
| `HttpClient` com interceptors funcionais | `fetch` direto; `provideHttpClient` não registrado (§2) |
| Lazy loading de rotas | ausente (§7) |
| Formulários reativos tipados | formulários sem validação estruturada; erros por `alert()` (§6) |
| `@defer` para blocos pesados | não usado |
| Qualidade em CI (`budgets`, Lighthouse, `nx affected`) | só o orçamento `anyComponentStyle` existe no `project.json`; sem CI |

Parte dessas práticas está disponível no 18 e parte exige atualizar o Angular. O D9 separa as duas.

## Decisão

Refatorar em fases, **mantendo as rotas e a aparência**, exceto onde indicado como mudança de comportamento.

### D1. Reorganizar em camadas
Estrutura alvo, sem mudar nenhuma rota:

```
apps/painel-admin/src/
├── environments/                 # environment.ts, environment.prod.ts
├── styles/                       # _tokens.css, base, buttons, tables, forms, badges
├── app/
│   ├── core/
│   │   ├── api/                  # api-client.ts, api-error.ts
│   │   ├── interceptors/         # erro (fase 7) e auth (fase 8)
│   │   ├── guards/               # auth.guard.ts (fase 8)
│   │   ├── mappers/              # veiculo.mapper.ts, motorista.mapper.ts, ...
│   │   ├── models/               # interfaces + enums/
│   │   └── notification/         # ToastService, ConfirmService
│   ├── shared/
│   │   ├── ui/                   # status-badge, data-table, page-header, empty-state, button, form-field
│   │   ├── pipes/                # status-label.pipe.ts
│   │   └── constants/            # status-config.ts
│   └── features/
│       ├── dashboard/  veiculos/  motoristas/  manutencoes/  entregas/
│       │   └── <feature>.page.ts|html|css + <feature>-api.service.ts
│       └── layout/               # sidebar, shell
```

Cada página passa a `loadComponent` (lazy), com `templateUrl` e `styleUrl` em arquivos próprios, e uma rota 404 real. As libs órfãs ficam para a ADR do `rastreamento` decidir (tipos compartilhados só fazem sentido com os dois apps).

### D2. Requisições em arquivos próprios
- `core/api/api-client.ts`: wrapper de `HttpClient` com `get/post/put/patch`, URL base vinda do `environment`, timeout e **erro tipado** (`ApiError` com `status` e `mensagem`). **Não engole erro.**
- Um serviço por recurso: `veiculos-api.service.ts`, `motoristas-api.service.ts`, `manutencoes-api.service.ts`, `entregas-api.service.ts`. Cada um só conhece paths, query e mapper.
- `environment.ts` com `apiFrotasUrl` e `apiEntregasUrl`; `provideHttpClient(withInterceptors([...]))` em `app.config.ts`.
- **Mappers** `API ⇄ modelo do painel` em `core/mappers/` (`ano` ⇄ `anoFabricacao`, `km_atual` ⇄ `quilometragem`, `validade_cnh` ⇄ `vencimentoCnh`, `codigo_rastreio` ⇄ `numero_pedido`…). Isso resolve o contrato (problema 4) sem tocar nas APIs. Campos que a API não tem (`marca`, `cpf`, `oficina`…) saem do formulário e da tabela em vez de ficarem em branco, **com aprovação** (muda a tela).
- Os componentes passam a ter estados explícitos `carregando`, `erro` e `vazio`, e mostram erro de verdade. O cache vira `shareReplay` **ou** signals com `toSignal` (D9a), com invalidação nas mutações.
- Remover os 5 métodos sem chamador e o `DELETE` inexistente. O botão "Excluir" passa a chamar `PATCH /veiculos/{id}/desativar` e a se chamar "Desativar" (**muda comportamento e rótulo, fase 8, a aprovar**).
- Query de entregas por motorista usa `motorista_id`.

### D3. Enums e constantes de status
- `core/models/enums/` com `StatusVeiculo { ATIVO, INATIVO, MANUTENCAO }`, `StatusMotorista { ATIVO, INATIVO, FERIAS }`, `StatusManutencao { PENDENTE, EM_ANDAMENTO, CONCLUIDA, CANCELADA }` e `StatusEntrega { PENDENTE, ATRIBUIDA, EM_TRANSITO, ENTREGUE, CANCELADA }`, como *string enums* com os valores **reais** da API. Os valores definitivos de `StatusEntrega` serão conferidos contra o model da api-entregas na fase 3 (`ATRIBUIDA` aparece nas ADRs das APIs).
- `shared/constants/status-config.ts` com um único `STATUS_CONFIG` por domínio: rótulo em pt-BR, classe CSS e ícone. Um `StatusLabelPipe` e o `app-status-badge` o consomem, e o badge deixa de mostrar `EM_MANUTENCAO` cru.
- Normalização de caixa **só no mapper** (um `toUpperCase()` na borda). Os remendos em minúsculas e o CSS duplicado saem.
- Tipos de `status`, `tipo` e `categoria_cnh` passam de `string` para os enums/uniões.
- `AFASTADO` sai da UI (a API não aceita); `veiculosInativos` do dashboard passa a contar só `INATIVO`.

### D4. Estilos em classes reutilizáveis
- **Tokens** em `src/styles/_tokens.css` (custom properties): cores com contraste ≥ 4,5:1, espaçamento, raios, sombras, tipografia em `rem`. Os valores repetidos de §1 viram tokens (`--cor-texto`, `--sombra-card`, `--raio-card`…).
- **Estilos globais por classe**, em arquivos separados importados por `styles.css`: `.btn` (`--primary`, `--secondary`, `--danger`, `--icon`), `.data-table`, `.status-badge` (variantes via `data-status` ou classe gerada pelo `STATUS_CONFIG`), `.page-header`, `.form-grid`/`.form-field`, `.empty-state`, `.detail-panel`, `.filters`, `.loading`.
- **Componentes standalone** em `shared/ui/`: `app-status-badge`, `app-data-table`, `app-page-header`, `app-empty-state`, `app-button`, `app-form-field`. Cada um com `templateUrl`/`styleUrl`.
- Cada página perde o CSS duplicado e mantém só o que é específico dela. Meta: nenhum `styles: [...]` ou `template: ...` inline (exceto componentes de poucas linhas).
- O reset `*` é trocado por um *reset* mais conservador e `a {text-decoration: none}` sai (links voltam a ser distinguíveis).
- **CSS puro com custom properties** (sem adicionar SCSS ou biblioteca de UI). Reversível: se a equipe preferir SCSS, a estrutura de arquivos é a mesma.
- O orçamento `anyComponentStyle` deve passar sem aumentar o limite.

### D5. Segurança
**D5a. Sem mudança de contrato (fase 7):**
- `lang="pt-BR"`; **CSP** (meta tag no `index.html` em desenvolvimento e cabeçalho no servidor que servir o build), restrita a `self` e às duas APIs configuradas.
- Substituir `alert()`/`confirm()`/`console.*` por `ToastService`, `ConfirmService` (diálogo acessível, ver D6) e um `ErrorHandler` global. Erros de API chegam à tela pelo `ApiError`, sem despejar objetos no console.
- `Router.navigate` no lugar de `window.location.href`.
- `environment` sem segredos; `package-lock.json` versionado; `engines` no `package.json`.
- Regra de lint (`no-restricted-syntax`/`no-restricted-properties`) contra `innerHTML`, `bypassSecurityTrust*`, `console.*` e `window.location.href`.
- Rota 404 e lazy loading (D1).

**D5b. Muda comportamento (fase 8, cada item aprovado):**
- Login + `authGuard` + interceptor `Authorization: Bearer`. **Depende** da decisão de IdP/JWT do MAPA T2 e da D4b da ADR da api-entregas. Enquanto as APIs não validarem token, o interceptor fica pronto e desligado por `environment`.
- "Excluir" → "Desativar" (D2).

> ⚠️ **Muda o comportamento.** Ativar auth no painel exige que as APIs e o ambiente já estejam prontos. Alinhar com as ADRs das 3 APIs antes do merge.

### D6. Acessibilidade (WCAG 2.1 AA)
- **Teclado:** linhas, cards e cabeçalhos clicáveis viram `<button>` ou `<a routerLink>` (preferido). Quando a linha inteira precisar ser clicável, usar um link na célula principal e `tabindex="0"` + `keydown.enter`/`keydown.space` + `role` adequado. Os 5 `(click)` do dashboard viram links (`routerLink` + `queryParams`).
- **Formulários:** `app-form-field` associa `<label for>` ao `id` do campo, com `aria-required`, `aria-invalid` e `aria-describedby` apontando para a mensagem de erro (que deixa de ser `alert()`). Nos painéis de detalhe, `label`+`span` viram `dl/dt/dd`.
- **Tabelas:** `<caption>` (pode ser visualmente oculto), `<th scope="col">`, ordenação com `<button>` dentro do `th` e `aria-sort`.
- **Status e severidade:** texto + ícone, nunca só cor. Emojis decorativos com `aria-hidden="true"`; os que carregam significado (🔴🟡🔵) ganham texto ("Crítico", "Atenção", "Info"). `✕` ganha `aria-label="Fechar"`.
- **Anúncio de estado:** `role="status"`/`aria-live="polite"` em carregamento e `role="alert"` em erro.
- **Foco:** `:focus-visible` global com contorno de alto contraste; painéis e diálogos abrem com foco movido ao título, devolvem o foco ao fechar e fecham com `Esc`; `ConfirmService` usa `role="dialog"`/`aria-modal="true"` com *focus trap*.
- **Visual:** tokens com contraste ≥ 4,5:1 (texto) e ≥ 3:1 (componentes), conferidos com ferramenta; `font-size` em `rem` e mínimo de 12 px; `prefers-reduced-motion` respeitado.
- **Responsivo:** sidebar colapsável abaixo de um *breakpoint*; tabelas em contêiner com `overflow-x: auto`; grids com `auto-fit`.
- **Landmarks:** `<nav aria-label>`, `<main id="conteudo">` e *skip link* "Pular para o conteúdo"; `aria-current="page"` no item ativo da sidebar.
- **Automação:** regras `@angular-eslint/template/accessibility` ligadas (`click-events-have-key-events`, `interactive-supports-focus`, `label-has-associated-control`, `elements-content`, `table-scope`) e `@axe-core/playwright` nos fluxos principais do e2e.
- Meta: **zero violações sérias/críticas do axe** nas 5 telas e navegação completa só por teclado.

### D7. Comentários
- Remover os `TODO` resolvidos por esta ADR (sem lazy loading, URL hardcoded, God Object, status como string, cache manual…). Os que permanecem apontam para esta ADR ou para uma seção do MAPA, em vez de repetir a explicação.
- Comentar só regra não óbvia (por exemplo, por que o mapper converte `MANUTENCAO` para o rótulo "Em manutenção", ou por que o interceptor de auth está desligado por `environment`).
- Feito em PR próprio e sem mudança de lógica, para facilitar a revisão.

### D8. Estratégia de testes
Hoje a cobertura é praticamente zero (e os 3 testes existentes falham, por leitura). **Nenhuma fase de refatoração entra sem os testes da fase anterior verdes.**

**Ferramentas**
- Jest (já configurado pelo Nx) com `TestBed` e `HttpTestingController`; Playwright já existe em `painel-admin-e2e`, com `@axe-core/playwright`.
- Scripts no `package.json`: `test`, `test:coverage`, `lint`, `e2e` (hoje `"scripts": {}`).
- Pastas ao lado do código (`*.spec.ts`) e e2e em `apps/painel-admin-e2e/src`.

**Camadas**
| Camada | O que cobre |
|---|---|
| Caracterização | Comportamento **atual** antes de refatorar, inclusive o "errado": serviço devolve `[]` com a API fora, `salvarVeiculo` fecha o form com `null`, `veiculosInativos` conta manutenção, remendo de caixa do dashboard. Substitui os specs quebrados. |
| Unitários | Mappers (ida e volta), `STATUS_CONFIG`/`StatusLabelPipe`, `api-client`, serviços de API, `ToastService`/`ConfirmService`. |
| Componentes | `TestBed` com serviços mockados: estados `carregando`/`erro`/`vazio`, filtros, ordenação, formulário e foco. |
| Contrato | Os mappers contra **payloads reais** das APIs (DTOs de `rotalog-api-frotas` e model de `rotalog-api-entregas`), incluindo o POST de veículo (`anoFabricacao`, `quilometragem`) e a leitura de `numero_pedido`. |
| E2E | Playwright com as 3 APIs e o Postgres: listar, criar, editar e desativar veículo; listar motoristas, manutenções e entregas; API fora de ar mostra erro; axe em cada tela. |

**Casos mínimos**
- **Mappers:** campos renomeados nos dois sentidos; campos ausentes; status em caixa diferente; datas.
- **api-client:** sucesso; `404`; `500`; timeout; erro de rede → `ApiError` (nunca `[]`).
- **Veículos:** criar com `anoFabricacao`; editar; desativar chama `PATCH …/desativar`; falha de API não fecha o formulário.
- **Motoristas:** `vencimentoCnh` chega ao payload; CNH vencida calculada do campo correto.
- **Entregas:** `motorista_id` na query; `numero_pedido` aparece na coluna Código; sem token, erro visível.
- **Dashboard:** contadores por status com os enums; sem valores fixos de manutenção.
- **Acessibilidade:** `label` associado a todo campo; linhas navegáveis por Tab e acionadas por Enter/Espaço; `aria-sort` atualizado; diálogo prende e devolve o foco; axe sem violações sérias.
- **Lint:** falha se `console.*`, `alert(`, `innerHTML` ou `bypassSecurityTrust*` voltarem a `src/`.

**Meta e qualidade**
- Cobertura sugerida ≥ 80% de linhas em mappers, services, pipes e `shared/ui`, com `coverageThreshold` no Jest para não regredir.
- CI (`npm ci && npx nx lint painel-admin && npx nx test painel-admin && npx nx build painel-admin`) como item opcional da fase 1.
- `nx-welcome.component.ts` e o `error.log` saem na fase 2.
- Os arquivos novos (`environments/`, `core/`, `shared/`, `styles/`) só serão criados quando esta ADR for implementada.

### D9. Boas práticas modernas do Angular
Separadas por versão: o **D9a** vale para o Angular 18 e entra junto das fases 4 a 6, **em código novo e nos componentes que forem reescritos** (sem migração em massa do legado). O **D9b** depende da ADR de atualização do Angular (MAPA §4.4) e fica só registrado.

**D9a. Disponível no Angular 18**
| Prática | Onde se aplica |
|---|---|
| Control flow `@if`/`@for (… ; track …)`/`@switch` no lugar de `*ngIf`/`*ngFor` (existe schematic de migração `control-flow`) | todos os templates; o `track` substitui a falta de `trackBy` |
| `inject()` no lugar da injeção por construtor; guards e interceptors **funcionais** | services, `api-client`, interceptors, `authGuard` |
| **Signals** (`signal`, `computed`; `effect` só para efeitos colaterais) para o estado de cada página: lista, filtro e `carregando`/`erro`/`vazio` | páginas de `features/` |
| `input()`, `output()` e `model()` no lugar de `@Input`/`@Output` | componentes de `shared/ui` |
| `OnPush` em **todo componente novo** | tudo |
| `toSignal`, `takeUntilDestroyed` e `DestroyRef` para ligar o `HttpClient` (RxJS) aos signals sem vazamento | pages e services |
| `withComponentInputBinding()` no router (parâmetro de rota vira `input()`) | `app.config.ts` |
| Formulários reativos **tipados** (`FormBuilder.nonNullable`) com validadores; o `app-form-field` (D6) exibe o erro | veículos, motoristas |
| `@defer` para blocos fora da dobra (painéis de detalhe, tabelas secundárias) | dashboard, detalhes |
| Padrão *smart/presentational*: a página injeta o service; os componentes de apresentação só têm `input()`/`output()` | todas as features |
| Estado de feature em um service com signals (*facade*). NgRx SignalStore fica **adiado** | `features/` |
| Tooling: ESLint flat com `@angular-eslint` (incluindo as regras de acessibilidade do D6), Prettier, `nx affected` no CI; `husky` + `lint-staged` e `commitlint` opcionais | raiz do workspace |
| `ErrorHandler` global (D5a) enviando erros a um serviço de log trocável (Sentry ou similar, opcional) | `core/` |
| `budgets` de bundle e Lighthouse CI como critério de PR | `project.json`, CI |

**D9b. Depende da atualização do Angular (confirmar em angular.dev)**
- **Zoneless:** a detecção de mudanças sem `zone.js` está estável nas versões recentes. Exige componentes OnPush e signals, que o D9a já prepara.
- **`resource`, `rxResource` e `httpResource`:** leitura de dados reativa a signals. Estão estáveis nas versões mais novas e ainda eram experimentais em versões intermediárias. Substituiriam parte do `api-client` (D2).
- **Signal Forms:** introduzidos em versão recente, com estágio a verificar. Seriam o sucessor dos formulários reativos tipados.
- **`linkedSignal` e `@let`**, também dependentes da versão.
- **Vitest como runner padrão:** as versões recentes adotam o Vitest. Este ADR mantém o Jest (D8) enquanto o projeto estiver no 18, e a troca entra na ADR de atualização.
- **SSR e hydration** estão **fora de escopo**: o painel é interno e autenticado.

> A ADR de atualização do Angular/Nx (MAPA §4.4) **ainda não foi escrita** e é pré-requisito do D9b.

## Alternativas consideradas

| Alternativa | Motivo da rejeição / adiamento |
|---|---|
| Só mover o CSS inline para arquivos | Não elimina a duplicação (as mesmas classes seguem em 5 lugares) nem resolve acessibilidade e requisições. Vira parte da **fase 5**, não a solução completa. |
| Adotar Angular Material ou PrimeNG | Resolve parte da acessibilidade, mas muda o visual e traz dependência grande. **Adiado**: avaliar depois dos tokens e dos componentes `shared/ui`. |
| NgRx / gerenciamento de estado global | O estado é local a cada página. Escopo maior sem demanda. **Rejeitado** nesta ADR. |
| Manter `fetch` e só tratar erros | Perde interceptors, tipagem e testabilidade com `HttpTestingController`. **Rejeitado.** |
| Alterar as APIs para casar com os nomes do painel | As APIs são o contrato com outros consumidores (a api-frotas é consumida pela api-entregas, por exemplo). O painel se adapta por mappers. **Rejeitado.** |
| Migrar Angular 18 → 19+ junto com a refatoração | Mistura upgrade com reorganização. Fica em ADR própria (MAPA §4.4). **Adiado.** |
| Ligar login/guard já na primeira fase | Depende de IdP/JWT e de as APIs validarem token (MAPA T2). Fica na **fase 8**. |
| Gerar o cliente a partir de OpenAPI (T1) | O `openapi.yaml` está desatualizado e as APIs não geram o seu. Reavaliar quando existir contrato por serviço. **Adiado.** |
| `OnPush` e signals em tudo agora | **Adotados em código novo e em componentes reescritos (D9a).** Migração em massa do legado: rejeitada, não é necessária para os objetivos. |
| Zoneless, `httpResource` e Signal Forms agora | Dependem de versões mais novas do Angular. **Adiado** para a ADR de atualização (D9b). |
| NgRx / SignalStore para estado de feature | Services com signals bastam. **Adiado.** |
| SSR / hydration | Painel interno e autenticado, sem ganho de SEO. **Rejeitado.** |
| SCSS no lugar de CSS puro | Sem ganho claro com custom properties. Escolha reversível. |

## Consequências

**Positivas**
- Estilos em um só lugar, com tokens, e componentes de página bem menores.
- Requisições isoladas, tipadas e testáveis; erro de API deixa de se parecer com lista vazia.
- Typos e divergências de status deixam de compilar; fim dos remendos de caixa.
- Telas operáveis por teclado e leitor de tela, com contraste e responsividade.
- Menos superfície de ataque (sem `alert`/`console`, CSP, regra de lint contra `innerHTML`) e caminho claro para autenticação.
- Cobertura de teste onde hoje os testes existentes nem passam.
- Código novo já no estilo atual do Angular (signals, `OnPush`, control flow), o que reduz o trabalho da atualização de versão (D9).

**Negativas / riscos**
- Mais arquivos e pastas no módulo.
- Mostrar erro de verdade expõe problemas hoje escondidos (por exemplo, entregas sem token).
- Remover campos que a API não tem (`marca`, `cpf`, `oficina`…) muda a tela.
- "Excluir" → "Desativar" muda a semântica da ação.
- A fase 8 (auth) depende das APIs e do IdP.
- Remover comentários apaga contexto histórico do curso. O MAPA e esta ADR passam a ser o registro.
- Durante a migração convivem dois estilos (legado com `*ngIf`/`@Input` e novo com control flow/signals), e há curva de aprendizado de signals para quem vem de RxJS.

**Não muda**
- As rotas do painel, as 3 APIs e seus contratos.
- Angular 18, Nx 19 e a lista de dependências (a atualização é outra ADR, MAPA §4.4).
- O app `rastreamento` e as libs React.
- A decisão sobre `libs/shared-types`, `ui-components` e `api-contracts` (ver D1).

## Plano de implementação

Cada fase deve ser um PR/commit independente.

> **Andamento (2026-11-09):** fases 1 a 8 implementadas e verificadas (Jest 162 testes, lint, build de produção e Playwright+axe no Chromium, 30 testes). **Fase 8:** (1) "Excluir" virou "Desativar" (`PATCH /veiculos/{id}/desativar`, botão desabilitado para INATIVO, `excluir()` removido do service); (2) campos que as APIs não têm saíram dos modelos, tabelas e formulários (veículo: marca, tipo, status, última manutenção; motorista: CPF, telefone, e-mail, status; manutenção: oficina; a busca de motoristas passou a ser por nome ou CNH); (3) auth pronta e **desligada** (`environment.autenticacao.ativa = false`): `AuthService`, `authInterceptor` (Bearer só para as duas APIs; 401 encerra a sessão), `authGuard`/`loginGuard`, tela `/login` e botão Sair. **Suposição a validar:** não existe endpoint de login; a tela assume `POST loginUrl` com `{ usuario, senha }` devolvendo `{ token }`, e `loginUrl` está vazio. Ao ligar a auth: definir o endpoint (MAPA T2), incluir o host em `connect-src` da CSP, e lembrar que o token em `sessionStorage` é legível por qualquer script da página. Não há reativação de veículo na tela (a API tem `PATCH …/reativar`, o service também). **Pendente em produção:** a CSP tem de ser repetida como cabeçalho HTTP do servidor, com os hosts reais e `frame-ancestors`; a meta tag lista `localhost`. O `ErrorHandler` só vê erros dentro da zona do Angular. O e2e roda com as APIs mockadas (`apps/painel-admin-e2e/src/fixtures.ts`) e não cobre auth ligada (só testes unitários); o `playwright.config.ts` ainda lista firefox e webkit, não instalados aqui (use `--project=chromium`).

1. **Infra de testes e caracterização:** scripts, Jest funcionando, specs quebrados substituídos, testes de caracterização, e2e básico. Opcional: CI.
2. **Limpeza:** remover `nx-welcome` e `error.log`, `lang`, `console.*` mortos, comentários (D7), `engines`, `package-lock.json`.
3. **Enums, `STATUS_CONFIG` e mappers** (D3 e parte da D2), com testes de contrato.
4. **Camada de API:** `HttpClient`, `environment`, serviços por recurso, `ApiError`, estados `carregando`/`erro`/`vazio` (D2), com `inject()` e interceptors funcionais (D9a).
5. **Estilos:** tokens, classes globais, componentes `shared/ui`, `templateUrl`/`styleUrl` e reorganização em `features/` com lazy loading (D1 e D4). Componentes novos já com control flow, signals, `input()`/`output()` e `OnPush` (D9a).
6. **Acessibilidade:** teclado, formulários, tabelas, ícones, anúncio de estado, foco, contraste, responsivo, lint e axe (D6). Formulários tipados com `app-form-field` (D9a).
7. **Segurança sem mudança de contrato:** CSP, `ToastService`/`ConfirmService`, `ErrorHandler`, `Router.navigate`, 404, regras de lint (D5a).
8. **Mudanças que alteram comportamento,** cada uma aprovada e comunicada: login/guard/Bearer, "Excluir" → "Desativar", remoção de campos inexistentes na API (D5b e D2).

**Depois da ADR de atualização do Angular/Nx** (ainda não escrita): zoneless, `httpResource`, Signal Forms e Vitest (D9b).

## Verificação (quando for implementar)
- `npx nx test painel-admin --coverage` e `npx nx lint painel-admin` verdes, com a meta de cobertura atingida.
- `npx nx build painel-admin --configuration=production` sem estourar o orçamento de estilos por componente.
- `npx nx e2e painel-admin-e2e` com o axe sem violações sérias ou críticas nas 5 telas.
- `grep -rnE "console\.|alert\(|confirm\(|innerHTML|bypassSecurityTrust|localhost|window\.location" apps/painel-admin/src` sem resultados (a exceção é `environment.ts`, para `localhost`).
- Subir o Postgres (`docker-compose up -d postgres` em `rotalog-workspace`) e as 3 APIs; exercitar listar, criar, editar e desativar veículo, motoristas, manutenções e entregas, comparando as telas antes e depois de cada fase.
- Criar um veículo pelo painel e confirmar que `anoFabricacao` e `quilometragem` chegam à API.
- Derrubar uma API e confirmar que a tela mostra erro (e não lista vazia).
- Navegar por todas as telas **só com o teclado** e com um leitor de tela (NVDA), conferindo foco visível, rótulos e anúncio de erro.
- Conferir o contraste dos tokens com uma ferramenta (WebAIM ou o DevTools).
- Confirmar que o `context-path=/api` da api-frotas (o `CLAUDE.md` diz que sim; a exploração não encontrou o `application.properties`).
- Boas práticas (D9a): `grep -rnE "\*ngIf|\*ngFor|@Input\(|@Output\(" apps/painel-admin/src` sem resultados nos arquivos novos; todo componente novo com `OnPush`; `npx nx build painel-admin --configuration=production` dentro dos `budgets`; Lighthouse CI sem regressão; estado das páginas lido por signals, sem `subscribe` manual sem `takeUntilDestroyed`.
- Antes de implementar o D9b, conferir na documentação oficial do Angular a versão em que cada recurso (zoneless, `httpResource`, Signal Forms, Vitest) passa a ser estável.
