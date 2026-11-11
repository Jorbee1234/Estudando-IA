# ADR 0002 — Reorganização, segurança, acessibilidade e testes do `rastreamento` (React)

- **Status:** Implementado (fases 1 a 8). O e2e (Playwright + axe) e a verificação no navegador foram feitos na [ADR 0004](0004-evolucao-visual-rastreamento.md). Pendentes: teste com leitor de tela e o fim do `GET /api/entregas` público na api-entregas (fase 6 da ADR dela)
- **Data:** 2026-11-08
- **Escopo:** `rotalog-frontend` — [apps/rastreamento/src/](../../apps/rastreamento/src/)
- **Base:** [MAPA_DIVIDAS_TECNICAS.md](../../../rotalog-workspace/MAPA_DIVIDAS_TECNICAS.md) §4.1, §4.2, §4.3, §4.4, §4.5, §4.6, §4.7, §4.8, T1, T2, T5, T6 e T7
- **Práticas modernas:** [react.dev](https://react.dev). O que depende de versão está separado no D9b e **deve ser confirmado na documentação oficial antes de implementar** (a pesquisa que originou o D9 usou fontes secundárias).
- **Relacionadas:** [ADR 0001 do painel-admin](0001-reorganizacao-seguranca-acessibilidade-painel-admin.md) (mesmo padrão e mesmas libs órfãs) e a ADR da `rotalog-api-entregas` (D4a/D4b), de que a fase 8 depende.

## Contexto

O `rastreamento` é o portal **público** de acompanhamento de entregas. Tem 1221 linhas em `src/` (os 3 componentes somam 596, o `styles.css` tem 460 e o `App.tsx` 130). Os 4 componentes são class components com `React.Component<any, any>`, e a palavra `any` aparece em 32 linhas. O mapa é montado com o Leaflet carregado por CDN, e os popups são strings HTML concatenadas com dados vindos da API. Por ser dívida técnica intencional do projeto, nada foi alterado até agora. Esta ADR registra os problemas encontrados e a direção da refatoração. **Ela não altera código.**

Os temas tratados são: segurança (XSS e exposição de dados), camada de requisições, enums de status, estilos em classes, acessibilidade, comentários, tipagem, testes e práticas modernas do React (D9).

> **Sobre o estilo local.** O `CLAUDE.md` do projeto manda não corrigir dívida técnica proativamente e seguir o estilo do módulo. Tudo o que está aqui só vale porque a refatoração foi pedida, e deve ser feito na fase indicada, não de passagem em outras mudanças.

> **Medições.** Os números vêm de leitura e contagem por busca no código. Não rodei build, Jest, Playwright nem ferramenta de contraste. Itens marcados como *estimativa* precisam ser confirmados na implementação.

## Problemas identificados

### 1. XSS armazenado nos popups do mapa
[MapView.tsx](../../apps/rastreamento/src/components/MapView.tsx) monta o HTML dos popups por concatenação de strings e o entrega ao `bindPopup`:

| Linha | Dado interpolado | Origem |
|---|---|---|
| [144](../../apps/rastreamento/src/components/MapView.tsx#L144) | `origem_endereco` | `POST /api/entregas`, texto livre |
| [156](../../apps/rastreamento/src/components/MapView.tsx#L156) | `destino_endereco` | idem |
| [157](../../apps/rastreamento/src/components/MapView.tsx#L157) | `motorista_nome` | idem |
| [210](../../apps/rastreamento/src/components/MapView.tsx#L210) | `descricao` do evento | `POST /api/rastreamento/:id`, **sem autenticação** |

**São 4 campos; o MAPA §4.3 cita 3** (falta `descricao`). A api-entregas não valida nem sanitiza esses campos (colunas `STRING` livres). O app não usa `innerHTML` nem `dangerouslySetInnerHTML`: a injeção acontece via `bindPopup(string)` e pelo `html:` do `L.divIcon`. Um endereço como `<img src=x onerror=...>` executa JavaScript no portal público para qualquer visitante que abrir a entrega. Como o `POST` de eventos não exige token, o `descricao` é o caminho mais fácil para um atacante. Há ainda cerca de 10 trechos `style="..."` dentro dessas strings, que também impedem uma CSP sem `unsafe-inline`.

### 2. Dados demais num portal público
O app lista `GET /api/entregas` inteiro ([App.tsx:40](../../apps/rastreamento/src/App.tsx#L40)): array sem paginação, sem filtro e sem autenticação ([routes/entregas.js:22](../../../rotalog-api-entregas/src/routes/entregas.js#L22)). Qualquer visitante recebe, de todas as entregas, `motorista_nome`, `veiculo_placa`, `veiculo_modelo`, endereços completos, `observacoes`, `peso_kg` e IDs sequenciais. **Isso não está no MAPA.** O app mostra `motorista_nome` na lista, no dashboard e no popup, e a placa e o modelo no dashboard.

Existe `GET /api/rastreamento/pedido/:numeroPedido`, mais enxuto (`pedido`, `status`, `origem`, `destino`, `data_criacao`, `data_entrega`, `eventos`, sem motorista nem placa), que o app não usa. A correção definitiva é uma mudança de contrato (D5b) e depende da api-entregas: enquanto `/api/entregas` for público, esconder campos no front **não** elimina a exposição.

### 3. Requisições espalhadas, sem tratamento de erro
Há 2 `fetch` em todo o app, ambos com `http://localhost:3000` fixo e sem `AbortController`:

| Local | Chamada | Situação |
|---|---|---|
| [App.tsx:40](../../apps/rastreamento/src/App.tsx#L40) | `GET /api/entregas` | Não checa `res.ok`: uma resposta `500` vira `{ error }`, que é guardado em `deliveries` e quebra o `.map` ([DeliveryList.tsx:70](../../apps/rastreamento/src/components/DeliveryList.tsx#L70)). O `catch` só faz `console.error` e mostra `Erro: {message}`. Sem retry. |
| [TrackingDashboard.tsx:56](../../apps/rastreamento/src/components/TrackingDashboard.tsx#L56) | `GET /api/entregas/{id}` a cada 5 s | **Descarta a resposta** (só grava `lastUpdate`, que nunca é lido na tela). Roda mesmo sem entrega selecionada (só deixa de chamar o `fetch`). Sem `res.ok`, sem abort, com corrida possível entre o polling e a troca de seleção. |

Consequências: o `delivery` do `App` nunca é atualizado pelo polling, então o mapa e o dashboard **não refletem** nenhum refresh. Em loading ou erro, o `render` do `App` retorna só uma `div` ([App.tsx:81-87](../../apps/rastreamento/src/App.tsx#L81-L87)), o que desmonta lista, dashboard e mapa (o mapa é recriado). O loading ocupa a tela inteira e o erro não tem botão de nova tentativa.

Outro ponto de contrato: `GET /api/rastreamento/:entregaId` e `/ultimo` respondem **404** quando não há eventos, caso normal para uma entrega `PENDENTE`. O app nunca chama esses endpoints; quando passar a chamar, precisa tratar o 404 como "sem eventos".

### 4. Mutações e bugs de estado
| Ponto | Situação |
|---|---|
| Mutação de props/estado | `delivery.rastreamentos.sort(...)` no render ([TrackingDashboard.tsx:140-141](../../apps/rastreamento/src/components/TrackingDashboard.tsx#L140-L141)) ordena o array do estado do `App` no lugar. |
| Chaves | `key={idx}` na timeline (143). |
| Estado derivado | `DeliveryList` copia `props.deliveries` para `filteredDeliveries` e usa `componentDidUpdate` para sincronizar; a ordenação inicial não é aplicada. |
| Tipos de dados | O Sequelize devolve `DECIMAL` como string. `destino_lat`/`origem_lat` chegam como string ao `mapCenter` ([App.tsx:61-62](../../apps/rastreamento/src/App.tsx#L61-L62)); `distancia_km` é tratado como número em [DeliveryList.tsx:43](../../apps/rastreamento/src/components/DeliveryList.tsx#L43). |
| Nulos | `distancia_km` e `tempo_estimado_minutos` nulos aparecem como "null km"/"null min"; `status.localeCompare` e `evento.replace` não têm guarda. |
| Camadas do mapa | A polyline sólida do trecho percorrido ([MapView.tsx:235](../../apps/rastreamento/src/components/MapView.tsx#L235)) não é guardada nem removida, então acumula a cada atualização. |
| Rota truncada | O mapa só desenha posições intermediárias com `status === 'EM_TRANSITO'`, e `GET /api/entregas` embute só 5 eventos por entrega (`limit: 5`), então a rota exibida fica incompleta (*estimativa*). |
| Dashboard | `calcularProgresso` ([TrackingDashboard.tsx:16-25](../../apps/rastreamento/src/components/TrackingDashboard.tsx#L16-L25)) deduz o progresso do status, com `FIXME` dizendo que deveria usar GPS. |

### 5. Leaflet por CDN, ignorando o pacote instalado
- [MapView.tsx:52-63](../../apps/rastreamento/src/components/MapView.tsx#L52-L63) cria um `<script>` em runtime apontando para `https://unpkg.com/leaflet@1.9.4/dist/leaflet.js` (com `integrity`), e usa `declare const L: any` (linha 8). O CSS também vem do CDN ([index.html:9-11](../../apps/rastreamento/src/index.html#L9-L11)).
- `leaflet`, `react-leaflet` e `@types/leaflet` estão no `package.json` e **nenhum arquivo do app os importa**.
- Não há deduplicação do `<script>` nem remoção no desmonte: com `StrictMode` ([main.tsx:13](../../apps/rastreamento/src/main.tsx#L13)), o mount duplo pode injetar o script duas vezes (*estimativa*).
- O CDN impede uma CSP estrita (`script-src 'self'`) e o uso offline. Os tiles são do OSM (`tile.openstreetmap.org`) e continuam sendo uma origem externa legítima.
- Um comentário diz que o webpack do Nx tem problemas com `react-leaflet`, sem evidência.

### 6. Status como `String`
| Ponto | Situação |
|---|---|
| `STATUS_CONFIG` | Duplicado em [DeliveryList.tsx:5-11](../../apps/rastreamento/src/components/DeliveryList.tsx#L5-L11) e [TrackingDashboard.tsx:6-12](../../apps/rastreamento/src/components/TrackingDashboard.tsx#L6-L12), com **valores idênticos** (5 chaves). **Correção do MAPA §4.8**, que sugeria valores diferentes entre os dois: a divergência é só com a lib `ui-components`. |
| Terceira cópia | `calcularProgresso` (um `switch` por status) e 6 linhas com `'STATUS'` entre aspas, mais 5 classes `.status-*` e `.status-default` no CSS. |
| Eventos x status | O badge de evento reaproveita `STATUS_CONFIG[evento]` ([TrackingDashboard.tsx:149](../../apps/rastreamento/src/components/TrackingDashboard.tsx#L149)), mas eventos como `POSICAO_ATUALIZADA` não são status e caem em `status-default`. |
| API | `Entrega.status` é `STRING(20)`, default `PENDENTE`; valores válidos: `PENDENTE`, `ATRIBUIDA`, `EM_TRANSITO`, `ENTREGUE`, `CANCELADA`. O app bate com a API. |
| Libs | [`StatusBadge`](../../libs/ui-components/src/StatusBadge.tsx) usa `pending`, `in_progress`, `completed`, `cancelled` (0 de 5 coincidem) e [`shared-types`](../../libs/shared-types/src/index.ts) usa minúsculas, sem `ATRIBUIDA`, com campos em inglês (`origin_address`, `driver_name`, `distance_km`). Nenhuma das duas é importada pelo app, e nenhuma serve como contrato (MAPA T1/T5). |

### 7. Acessibilidade
Auditoria por busca em `src/`: **0 ocorrências** de `aria-*`, `role=`, `tabIndex`, `alt=`, `htmlFor`, `:focus` e `prefers-reduced-motion`. Há 1 `@media` ([styles.css:445](../../apps/rastreamento/src/styles.css#L445)).

| Problema | Medição |
|---|---|
| Item clicável sem teclado | `div.list-item` com `onClick` ([DeliveryList.tsx:76](../../apps/rastreamento/src/components/DeliveryList.tsx#L76)), sem `role`, `tabIndex` nem `onKeyDown`. Os outros 2 `onClick` estão em `<button>`. |
| Rótulos | O `<select>` de ordenação não tem `<label>` ([DeliveryList.tsx:59-66](../../apps/rastreamento/src/components/DeliveryList.tsx#L59-L66)); 8 `<label>` no dashboard são usados como título, sem controle associado. |
| Mapa | O container ([MapView.tsx:304-308](../../apps/rastreamento/src/components/MapView.tsx#L304-L308)) não tem `role`, `aria-label` nem alternativa textual. Origem, destino e posições existem só no mapa/popup. Os marcadores são `div`. |
| Ícones | Emojis 📦 🏁 🚚 📍 como único ícone, sem texto acessível. |
| Progresso | Barra de progresso feita com `div` e `width` inline, sem `role="progressbar"` nem `aria-valuenow` ([TrackingDashboard.tsx:129-134](../../apps/rastreamento/src/components/TrackingDashboard.tsx#L129-L134)). |
| Anúncio de estado | Loading, erro e "Selecione uma entrega" sem `aria-live`/`role`; `map-loading` e `map-error` idem. |
| Landmarks | `<aside>` e `<main>` existem, sem `aria-label`; sem *skip link*. |
| Cor (*estimativa*) | O verde `#1D9E75` sobre branco ≈ 3,5:1 (botões, `h1`–`h6`, `.timeline-time`), abaixo de 4,5:1 para texto normal; `#999` e `#666` em várias regras. Validar com ferramenta. |
| Tipografia | todos os `font-size` em `px`; 10 px (`.timeline-event-badge`) e 11 px (`.item-status`). |
| Foco | sem estilo de foco próprio (o `outline` padrão não é removido, mas o `hover` dos botões é só cor). |
| Movimento | `transition: all` em `.list-item` e `.progress-fill`, sem `prefers-reduced-motion`. |
| Responsividade | 1 `@media (max-width: 768px)`. |
| Status | badge tem cor **e** texto (aceitável); origem/destino/posição no mapa dependem de cor + emoji. |

### 8. Estilos globais em um único arquivo
[styles.css](../../apps/rastreamento/src/styles.css) tem 460 linhas, 0 variáveis CSS, `#1D9E75` repetido ~11 vezes, `#ddd` ~9, `#666` ~6. Elementos globais vazam para o app todo: `*`, `body`, `h1`–`h6` (cor verde), `button`, `input`/`select`/`textarea`. Há 2 `!important` (`.custom-marker`), 3 `style={{}}` em JSX ([MapView.tsx:301](../../apps/rastreamento/src/components/MapView.tsx#L301), `:307` e [TrackingDashboard.tsx:132](../../apps/rastreamento/src/components/TrackingDashboard.tsx#L132)) e `.item-status` redeclarado. O topo do arquivo tem `TODO` pedindo CSS Modules.

As classes genéricas (`.sidebar`, `.loading-container`, `.error-container`, `.app-*`, `.list-*`, `.item-*`, `.status-*`) **podem colidir** com as do painel-admin se os apps forem unificados (MAPA §4.7); isto é *estimativa*, o CSS do painel não foi comparado linha a linha.

### 9. Tipagem, ferramentas e testes
| Item | Situação |
|---|---|
| TypeScript | [tsconfig.app.json](../../apps/rastreamento/tsconfig.app.json) com `strict: false`, `noImplicitAny: false`, `noUnusedLocals: false`, contra o `strict: true` do `tsconfig.base.json`. |
| Typecheck | O build usa Babel (`preset-typescript`), que **não faz typecheck**, e nenhum script roda `tsc`. Erros de tipo não derrubam nada. |
| PropTypes | 14 linhas (`(X as any).propTypes`) misturadas com TypeScript; `prop-types` só serve para isso. |
| Dependências | `react`, `react-dom`, `@types/*` e `prop-types` em `devDependencies` (são de runtime); `leaflet`/`react-leaflet` sem uso (§5). `scripts` do `package.json` vazio; sem `engines`. |
| Lint | [project.json](../../apps/rastreamento/project.json) usa o executor legado `@nx/linter:eslint`; o pacote instalado é `@nx/eslint`, então o target provavelmente falha (*estimativa*). A config tem `rules: {}`, sem `eslint-plugin-react`, `react-hooks` nem `jsx-a11y`. |
| Testes | Nenhum: sem target `test`, sem `jest.config`, sem spec, sem e2e do `rastreamento` (só existe `painel-admin-e2e`, com um exemplo). |
| Infra | Sem Dockerfile nem CI. `favicon.ico` com 6 bytes (provavelmente inválido, *estimativa*). |

### 10. Comentários que mentem e código morto
**29 marcadores** (23 `TODO` + 6 `FIXME`) em ~61 linhas de comentário (~5%, *estimativa*). Por arquivo: `App.tsx` 9, `TrackingDashboard.tsx` 6, `DeliveryList.tsx` 4, `MapView.tsx` 4, `main.tsx` 3, `styles.css` 2, `index.html` 1. O problema maior não é o volume, é que vários **são falsos**:

| Comentário | Realidade |
|---|---|
| Promessa de Redux ([App.tsx:24-25,38,60](../../apps/rastreamento/src/App.tsx#L24), `main.tsx:6`, `DeliveryList.tsx:30,34`, `TrackingDashboard.tsx:39,60`) | Não há Redux no projeto; `reduxState: null` não faz nada. |
| "Class component 70%" ([App.tsx:7](../../apps/rastreamento/src/App.tsx#L7)) | É 100%. |
| "Componentes muito grandes (500+ linhas)" ([App.tsx:76](../../apps/rastreamento/src/App.tsx#L76)) | O maior tem 324. |
| "PropTypes em vez de TypeScript" ([App.tsx:125](../../apps/rastreamento/src/App.tsx#L125)) | O sentido correto é o inverso. |
| "Webpack do Nx tem problemas com react-leaflet" ([MapView.tsx:5](../../apps/rastreamento/src/components/MapView.tsx#L5)) | Sem evidência. |

Código morto: `reduxState`, `filters`, `handleFilterChange`/`onFilterChange` (passado ao `DeliveryList`, que nunca o chama), `zoom`, `lastUpdate`, `refreshInterval` em `state` (deveria ser campo de instância), `import PropTypes` no `App`, `className` redundante no `STATUS_CONFIG`, e as libs não usadas.

### 11. Contratos que a refatoração precisa preservar
| Contrato | Observação |
|---|---|
| `GET /api/entregas` | Array puro, com `rastreamentos` embutido (5 mais recentes). Muda só na fase 8. |
| `GET /api/entregas/:id` | Entrega com todos os `rastreamentos`. |
| `GET /api/rastreamento/pedido/:numero` | `404` sem eventos é caso normal (entrega `PENDENTE`). |
| Campos | `snake_case`, `DECIMAL` como **string**, datas ISO. |
| Status | `PENDENTE`, `ATRIBUIDA`, `EM_TRANSITO`, `ENTREGUE`, `CANCELADA`. |
| Formato de erro | `{ "error": "..." }` com `500`. |
| Aplicação | Porta 3001; layout lista + dashboard + mapa. |

### 12. Práticas atuais do React ausentes
O app está em **React 18.3** com webpack e Babel. Hoje ele não usa o que o mercado adota como padrão:

| Prática atual | Situação no rastreamento |
|---|---|
| Function components e hooks | 4 de 4 são class components (§10) |
| Estado de servidor com cache, retry e cancelamento | `fetch` solto em 2 pontos e `setInterval` guardado em `state` (§3), sem cache, deduplicação nem retry |
| Validação de resposta em runtime | nenhuma: um `500` vira `{ error }` e quebra o `.map` (§3); `DECIMAL` como string e nulos tratados à mão (§4) |
| Code splitting (`React.lazy`/`Suspense`) | o Leaflet é carregado de forma imperativa e fora do bundle, sem divisão por rota ou região (§5) |
| `ErrorBoundary` por região | ausente; erro derruba a árvore inteira (§3) |
| Estado de UI como união discriminada | `loading`/`error` como campos soltos no `state` |
| `useEffect` só para sincronizar com sistemas externos | `componentDidMount`/`DidUpdate` fazem fetch e derivam estado (§4) |
| Tipos em vez de `prop-types` | 14 linhas de PropTypes com `any` (§9) |
| Testes de comportamento (RTL, MSW) | nenhum teste (§9) |
| Build moderno (Vite) | webpack + Babel, sem typecheck (§9) |

Parte dessas práticas está disponível no React 18 e parte exige atualizar o React e o Nx. O D9 separa as duas.

## Decisão

Refatorar em fases, **mantendo o layout e os endpoints atuais**, exceto onde indicado como mudança de contrato. **A correção do XSS vem antes da reorganização** (fase 3), por ser o único item que explora o portal público hoje.

### D1. Reorganizar em camadas e migrar para function components
Estrutura alvo, sem mudar o layout:

```
apps/rastreamento/src/
├── main.tsx
├── app/                      # App.tsx, ErrorBoundary.tsx
├── config/env.ts             # única leitura de configuração (URL da API)
├── api/                      # httpClient.ts, ApiError.ts, rastreamentoApi.ts
├── domain/
│   ├── status.ts             # enum StatusEntrega + STATUS_CONFIG
│   ├── tipos.ts              # Entrega, EventoRastreamento (tipos do front)
│   └── mappers.ts            # API -> modelo (Number, null, caixa)
├── hooks/                    # useEntregas, useRastreamento, useLeafletMap
├── components/
│   ├── DeliveryList/  TrackingDashboard/  MapView/
│   └── ui/                   # StatusBadge, ProgressBar, Timeline, StateMessage
└── styles/                   # tokens.css, base.css
```

Cada componente vira *function component* com hooks, com `Component.tsx` e `Component.module.css` lado a lado. O estado derivado de props sai (`useMemo`), e as chaves da timeline passam a ser estáveis (`data_evento` + `id`).

### D2. Requisições em arquivos próprios
- `config/env.ts` é o único lugar que lê a URL da API (variável de build do Nx/webpack), **sem `localhost` fixo no código**. Falha de configuração aparece na subida.
- `api/httpClient.ts`: `fetch` com `AbortController`, timeout, checagem de `res.ok` e **erro tipado** (`ApiError` com `status` e `mensagem`). Não engole erro.
- `api/rastreamentoApi.ts`: `listarEntregas()`, `buscarEntrega(id)` e, na fase 8, `buscarPorPedido(numero)`. O `404` de `/rastreamento/*` é tratado como "sem eventos" **apenas nesse ponto**.
- `hooks/useRastreamento`: o polling passa a **usar a resposta** (atualiza a entrega selecionada), só roda com uma entrega selecionada, pausa com a aba oculta (`visibilitychange`), cancela a requisição ao trocar de seleção ou desmontar e evita sobreposição de requisições. Com o D9a, esse hook vira uma camada fina sobre o `useQuery` do TanStack Query (`refetchInterval`, `enabled` e `signal`), em vez de timers escritos à mão.
- Loading e erro viram estados **por região** (lista, dashboard, mapa), com botão "Tentar novamente"; erro de uma não desmonta as outras nem o mapa.
- A lista passa a ser normalizada no mapper: `Number()` em coordenadas e distância, `null` exibido como "—", cópia antes de ordenar. Com o D9a, o mapper passa a ser um schema Zod com transformação, e uma resposta fora do formato vira `ApiError`.

### D3. Enums e constantes de status
- `domain/status.ts` com `StatusEntrega { PENDENTE, ATRIBUIDA, EM_TRANSITO, ENTREGUE, CANCELADA }` como *string enum* com os valores reais da API, e `TipoEvento` separado (eventos não são status).
- Um único `STATUS_CONFIG` (rótulo pt-BR, classe CSS, ícone e percentual de progresso) substitui as duas cópias, o `calcularProgresso` e os literais. O badge mostra **texto + ícone**, nunca só cor.
- Valores desconhecidos (um status novo vindo da API) caem em um estado "Desconhecido" explícito, não em `status-default` silencioso.
- **`libs/ui-components` e `libs/shared-types` não são adotadas por esta ADR**: o contrato delas diverge da API (§6). Mesma decisão do ADR 0001; o que fazer com as 3 libs (apagar, corrigir ou adotar) fica para uma ADR própria, com os dois apps.

### D4. Estilos em classes reutilizáveis
- `styles/tokens.css` com custom properties: cores (o verde primário ganha uma variante escura com contraste ≥ 4,5:1 para texto), espaçamento, raios, sombras, tipografia em `rem`.
- **CSS Modules** por componente (suportado pelo webpack do Nx), o que também elimina a colisão de nomes com o painel; o `base.css` fica só com reset conservador e foco. Alternativa registrada: prefixo `.rt-` nas classes.
- Sem `!important`, sem `style` inline (o progresso passa por custom property `--progresso`), sem `style="..."` em strings HTML (popups e ícones do mapa usam classes).
- `prefers-reduced-motion` respeitado; novos *breakpoints* além dos 768 px; lista, dashboard e mapa empilham em tela estreita.

### D5. Segurança
**D5a. Sem mudança de contrato (fase 3, prioridade):**
- **Eliminar o XSS.** Popups montados com nós DOM e `textContent` (ou renderizados com `createRoot` em um elemento passado ao `bindPopup`), **nunca** string HTML. O `divIcon` usa HTML estático e classes. Coberto por teste com o payload `<img src=x onerror=...>` nos 4 campos de §1.
- **Leaflet pelo pacote:** `import L from 'leaflet'` e `import 'leaflet/dist/leaflet.css'`, no bundle. Saem o `<script>` do CDN, o `declare const L: any`, o risco de script duplicado e o `<link>` do `index.html`. `react-leaflet` fica fora (ver Alternativas).
- **CSP** (meta tag em desenvolvimento e cabeçalho no servidor que servir o build): `default-src 'self'`, `img-src 'self' data: https://*.tile.openstreetmap.org`, `connect-src` apenas com a API configurada, sem `unsafe-inline` para scripts.
- `ErrorBoundary` e logger mínimo no lugar dos 4 `console.*`.
- Regra de lint (`no-restricted-syntax`/`react/no-danger`) contra `innerHTML`, `dangerouslySetInnerHTML` e concatenação de HTML em `bindPopup`.
- `engines` e `package-lock.json` versionado; `react`/`react-dom` em `dependencies`.

**D5b. Muda contrato (fase 8, cada item aprovado):**
- O portal passa a **buscar por número do pedido** em `GET /api/rastreamento/pedido/:numero` e deixa de baixar `GET /api/entregas`. A lista pública com motorista, placa e endereços deixa de existir (alinhado com a ADR da api-entregas D4b e com o MAPA T2).
- Rate limit em `/rastreamento/pedido/:numero` e CORS por origem, ambos na api-entregas.

> ⚠️ **Muda a UX e o contrato.** O portal deixa de listar todas as entregas e passa a exigir o número do pedido. Alinhar com a api-entregas antes do merge e verificar que `GET /api/entregas?veiculo=` continua atendendo a api-frotas.

Até a fase 8, o front **minimiza** o que exibe (sem `observacoes` e `peso_kg`), mas isso não resolve a exposição na API.

### D6. Acessibilidade (WCAG 2.1 AA)
- **Lista de entregas:** `<ul>` com um `<button>` por item (`aria-pressed` ou `aria-current`), no lugar de `div` com `onClick`. `<label>` associado ao select de ordenação.
- **Landmarks:** `<main>`, `<aside aria-label="Lista de entregas">`, *skip link* e `lang="pt-BR"` (já presente).
- **Estados:** `role="status"`/`aria-live="polite"` em carregamento e atualização; `role="alert"` em erro.
- **Progresso:** `role="progressbar"` com `aria-valuenow`, `aria-valuemin`, `aria-valuemax` e `aria-label`. Timeline como `<ol>` com `<time dateTime>`.
- **Mapa:** o container recebe `role="region"` e `aria-label`; um **resumo textual** (origem, destino, última posição, status) e a lista de posições ficam disponíveis fora do popup; marcadores com `keyboard`, `title` e `alt`; popup acessível por teclado.
- **Ícones e cor:** emojis decorativos com `aria-hidden="true"` e texto equivalente; origem, destino e posição atual diferenciados por texto e forma, além da cor.
- **Foco:** `:focus-visible` global; foco movido para o painel de detalhe ao selecionar uma entrega.
- **Visual:** tokens com contraste ≥ 4,5:1 (texto) e ≥ 3:1 (componentes), conferidos com ferramenta; `rem`; `prefers-reduced-motion`.
- **Automação:** `eslint-plugin-jsx-a11y` e `jest-axe` nos componentes, e `@axe-core/playwright` no e2e.
- Meta: **zero violações sérias ou críticas do axe** e navegação completa só por teclado.

### D7. Comentários
- Remover os comentários **falsos** de §10 (Redux, "70%", "500+ linhas", "PropTypes em vez de TypeScript", react-leaflet) e os `TODO`/`FIXME` resolvidos por esta ADR. Os que permanecem apontam para esta ADR ou para uma seção do MAPA.
- Comentar só regra não óbvia (por exemplo, por que `404` em `/rastreamento/*` não é erro, ou por que o popup nunca recebe HTML).
- Feito em PR próprio e sem mudança de lógica.

### D8. Estratégia de testes
Hoje a cobertura é zero. **Nenhuma fase de refatoração entra sem os testes da fase anterior verdes.**

**Ferramentas**
- Jest + React Testing Library + `@testing-library/user-event` + `jest-axe`; **MSW** para simular a API (D9a). O Leaflet é mockado nos testes de componente e exercitado de verdade no e2e.
- Novo projeto `rastreamento-e2e` (Playwright, como o do painel) com `@axe-core/playwright`.
- Scripts: `test`, `test:coverage`, `lint`, `typecheck` (`tsc --noEmit -p apps/rastreamento/tsconfig.app.json`). Corrigir o executor de lint para `@nx/eslint`.

**Camadas**
| Camada | O que cobre |
|---|---|
| Caracterização | Comportamento **atual** antes de refatorar, inclusive o "errado": lista pública completa, polling que descarta a resposta, `.sort` que muta o estado, `500` que quebra o `.map`, polyline que acumula, popup que concatena HTML (o teste de XSS **falha** de propósito até a fase 3). |
| Unitários | `mappers`, `STATUS_CONFIG`, `httpClient`, `rastreamentoApi`, `useRastreamento` (timers falsos, abort, pausa com aba oculta). |
| Componentes | Estados `carregando`/`erro`/`vazio`/`404`, seleção por teclado, ordenação, textos do resumo do mapa. |
| Segurança | Popup com `<img src=x onerror=...>` em `origem_endereco`, `destino_endereco`, `motorista_nome` e `descricao`: o DOM contém texto literal e nenhum elemento injetado; nenhum `window.onerror`/`alert`. |
| Contrato | Payloads reais de `/api/entregas`, `/api/entregas/:id` e `/api/rastreamento/pedido/:n` (a partir de `Entrega.js` e `rastreamento.js`), incluindo `DECIMAL` como string, `rastreamentos` com 5 itens e `404` sem eventos. |
| E2E | Com as APIs e o Postgres: carregar, selecionar entrega, ver mapa e timeline, API fora do ar mostra erro sem destruir o mapa, axe em cada estado. |

**Casos mínimos**
- **Mappers:** coordenadas string → número; `null` → "—"; status desconhecido; ordenação sem mutar.
- **httpClient:** sucesso; `404`; `500`; timeout; abort; JSON inválido → `ApiError` (nunca lista vazia).
- **useRastreamento:** a resposta atualiza a entrega; não consulta sem seleção; cancela ao trocar de entrega; pausa com aba oculta.
- **MapView:** uma polyline por trecho (sem acúmulo); remove o mapa no desmonte; Leaflet carregado uma vez.
- **DeliveryList:** item acionável com Enter e Espaço; `aria-pressed`; select com label.
- **Acessibilidade:** axe sem violações sérias; `progressbar` com valores; `aria-live` em loading e erro.
- **Lint:** falha se `innerHTML`, `dangerouslySetInnerHTML`, `console.*`, `: any` ou `unpkg` voltarem a `src/`.

**Meta e qualidade**
- Cobertura sugerida ≥ 80% de linhas em `api/`, `domain/` e `hooks/`, com `coverageThreshold` no Jest para não regredir.
- **Tipagem:** `strict` ligado por etapas (`noImplicitAny` primeiro), PropTypes removidos, `React.Component<any, any>` substituído por tipos; `typecheck` em CI.
- CI (`npm ci && npx nx lint rastreamento && npx nx test rastreamento && npx nx build rastreamento`) como item opcional da fase 1.
- A pasta de testes e os arquivos novos só serão criados quando esta ADR for implementada.

### D9. Boas práticas modernas do React
Separadas por versão: o **D9a** vale para o React 18.3 e entra junto das fases 4 a 6. O **D9b** depende da ADR de atualização do React e do Nx (MAPA §4.4) e fica só registrado.

**D9a. Disponível no React 18**
| Prática | Onde se aplica |
|---|---|
| **Estado de servidor com TanStack Query:** `useQuery`/`useMutation`, cache, deduplicação, retry, cancelamento por `signal`, `refetchInterval` com `refetchIntervalInBackground: false` e `enabled` por seleção | substitui o `setInterval` manual e o `fetch` solto; o `httpClient` (D2) continua como camada de transporte |
| **Validação de contrato em runtime com Zod** na borda: `schema.parse` no mapper e tipos TS derivados do schema (`z.infer`) | `api/` e `domain/mappers` |
| Estado de UI como **união discriminada** (`loading` \| `error` \| `success`) em vez de campos soltos | hooks e componentes |
| `React.lazy` + `Suspense` para tirar o mapa (Leaflet) do bundle inicial, e `ErrorBoundary` **por região** (lista, dashboard, mapa) | `MapView`, `app/` |
| `useDeferredValue`/`useTransition` na ordenação e filtro da lista; `useId` nos rótulos | `DeliveryList` |
| Não usar `useEffect` para derivar estado (derivar no render ou `useMemo`); `useEffect` só para sincronizar com sistemas externos (Leaflet, listeners), sempre com cleanup | `MapView`, `useLeafletMap` |
| TypeScript `strict` com `noUncheckedIndexedAccess`, sem `any`, `satisfies` para configs | `tsconfig` |
| Tooling: ESLint flat com `typescript-eslint` strict, `eslint-plugin-react-hooks` e `jsx-a11y`; Prettier; `nx affected` no CI; `husky` + `lint-staged` opcionais | raiz do workspace |
| Testes de comportamento: React Testing Library + `user-event` + **MSW** (no lugar de `fetch` mockado à mão) e Playwright + axe no e2e | D8 |
| `ErrorBoundary` reportando a um serviço de log trocável (Sentry ou similar, opcional); Web Vitals opcional | `app/` |
| Componentes primitivos acessíveis (`react-aria`, Radix) **só se** surgir diálogo ou menu, em vez de reinventar | opcional |

**D9b. Depende da atualização do React e do Nx (confirmar em react.dev)**
- **React 19:** Actions (`useActionState`, `useOptimistic`), `use`, `ref` como prop e metadados nativos.
- **React Compiler:** memoização automática, que passa a substituir `useMemo`/`useCallback` manuais. Pede componentes puros, que o D9a já prepara, e ajuste do Babel (ou do Vite).
- **Vite + Vitest** no lugar de webpack + Jest (`@nx/vite`): build, HMR e testes mais rápidos. Mexe na cadeia de build, então é item de atualização e não de reorganização. Até lá, Jest + RTL (D8).
- **`react-leaflet`:** reavaliar depois do Vite e do `import 'leaflet'` (ver Alternativas).
- **Cliente e tipos gerados de OpenAPI** (MAPA T1), quando a api-entregas publicar o contrato.

> A ADR de atualização do React/Nx (MAPA §4.4) **ainda não foi escrita** e é pré-requisito do D9b.

## Alternativas consideradas

| Alternativa | Motivo da rejeição / adiamento |
|---|---|
| Só escapar o HTML dos popups (função de escape) | Corrige os 4 pontos de hoje, mas qualquer novo campo concatenado reabre a falha. Nós DOM e `textContent` eliminam a classe de bug. **Rejeitado como solução primária.** |
| Sanitizar com DOMPurify | Dependência para um HTML que nem precisa existir. Só se um dia for necessário renderizar HTML vindo da API. **Rejeitado.** |
| Adotar `react-leaflet` | Reduz código imperativo, mas acrescenta abstração, e o comentário que alega problemas com o webpack do Nx não tem evidência. **Adiado**: reavaliar depois do `import 'leaflet'`. |
| Manter o Leaflet por CDN com SRI | Tem SRI, mas impede CSP estrita e mantém o pacote instalado sem uso. **Rejeitado.** |
| Redux, Zustand ou outro estado global de cliente | O estado é pequeno (lista, seleção) e cabe em hooks. **Rejeitado.** O estado de **servidor** (cache, polling, retry) vai para o TanStack Query: **adotado (D9a)**. |
| Adotar `libs/ui-components` e `shared-types` agora | O contrato delas diverge da API (§6). **Adiado**, ADR própria. |
| WebSocket/SSE no lugar do polling | Exige mudança na api-entregas. **Adiado.** |
| SSR/Next.js para o portal | Reescrita fora de escopo. **Rejeitado.** |
| Migrar React 18 → 19 e Nx junto | Mistura upgrade com reorganização. Fica em ADR própria (MAPA §4.4). **Adiado.** |
| Reorganizar antes de corrigir o XSS | Atrasa a correção do único item explorável hoje. **Rejeitado**: o XSS é a fase 3. |
| Filtrar PII só no front | Não resolve: `/api/entregas` continua público. Só a fase 8 resolve. **Registrado como mitigação parcial.** |
| `fetch` manual dentro de `useEffect` | Reimplementa cache, cancelamento e retry, e foi a origem do polling que descarta a resposta. **Rejeitado.** |
| SWR no lugar do TanStack Query | Equivalente para este caso. A escolha é reversível porque fica atrás de `hooks/`. |
| Migrar para React 19, React Compiler e Vite agora | Mistura upgrade com reorganização. **Adiado** para a ADR de atualização (D9b). |

## Consequências

**Positivas**
- XSS eliminado por construção e coberto por teste; CSP viável.
- Portal sem CDN de script, com Leaflet versionado no bundle.
- Requisições isoladas, canceláveis e tipadas; o refresh passa a atualizar a tela; erro deixa de derrubar o mapa.
- Status em um só lugar; menos strings soltas.
- Telas operáveis por teclado e leitor de tela, inclusive o mapa.
- Estilos sem colisão e com tokens; cobertura de teste onde hoje há zero.
- Cache, retry e polling prontos (TanStack Query), resposta da API validada em runtime (Zod) e mapa fora do bundle inicial (D9).

**Negativas / riscos**
- Mais arquivos e pastas; os 4 componentes são reescritos.
- O bundle cresce com o Leaflet (e o CSS) embutidos.
- A fase 8 muda a UX do portal (busca por número) e depende da api-entregas.
- Mostrar erro de verdade expõe problemas hoje escondidos.
- `strict` por etapas pode revelar muitos erros de tipo de uma vez.
- Novas dependências (`@tanstack/react-query`, `zod` e, em desenvolvimento, `msw`) e curva de aprendizado; um schema Zod desatualizado passa a falhar a tela em vez de mostrar dado errado.
- Remover comentários apaga contexto histórico do curso. O MAPA e esta ADR passam a ser o registro.

**Não muda**
- Os endpoints e o formato de resposta atuais (até a fase 8), a porta 3001 e o layout lista + dashboard + mapa.
- React 18, Nx 19 e a lista de dependências (a atualização é outra ADR, MAPA §4.4).
- O `painel-admin` (ADR 0001) e as 3 APIs.

## Plano de implementação

Cada fase deve ser um PR/commit independente.

1. **Infra de testes e caracterização:** Jest/RTL/jest-axe, scripts, correção do executor de lint, `typecheck`, testes de caracterização (inclusive o teste de XSS, que falha de propósito). Opcional: CI.
2. **Limpeza:** comentários falsos e `TODO` (D7), código morto (`reduxState`, `filters`…), `console.*`, favicon, `engines`, `package-lock.json`, dependências de runtime em `dependencies`.
3. **Segurança sem mudança de contrato (prioridade):** popups sem HTML, Leaflet por `import`, regra de lint, CSP, `ErrorBoundary` (D5a).
4. **Enums, `STATUS_CONFIG`, mappers e tipos:** `StatusEntrega`, `TipoEvento`, normalização de dados, `strict` por etapas (D3). Schemas Zod nos mappers (D9a).
5. **Camada de API e hooks:** `config/env.ts`, `httpClient`, `rastreamentoApi`, `useEntregas`, `useRastreamento` com polling real e estados por região (D2). Hooks sobre TanStack Query (D9a).
6. **Estilos e function components:** tokens, CSS Modules, remoção de estilos inline e de `!important`, migração dos 4 componentes, responsivo (D1 e D4). `React.lazy`/`Suspense` no mapa e `ErrorBoundary` por região (D9a).
7. **Acessibilidade:** teclado, labels, landmarks, `aria-live`, progressbar, alternativa textual do mapa, contraste, axe no e2e (D6).
8. **Mudanças que alteram contrato,** cada uma aprovada e comunicada: busca por `/rastreamento/pedido/:numero`, fim da lista pública, rate limit e CORS na api-entregas (D5b).

**Depois da ADR de atualização do React/Nx** (ainda não escrita): React 19, React Compiler, Vite + Vitest e cliente gerado de OpenAPI (D9b).

## Verificação (quando for implementar)
- `npx nx test rastreamento --coverage`, `npx nx lint rastreamento` e `tsc --noEmit` verdes, com a meta de cobertura atingida.
- `npx nx build rastreamento`; `npx nx e2e rastreamento-e2e` com o axe sem violações sérias ou críticas.
- `grep -rnE "console\.|innerHTML|dangerouslySetInnerHTML|localhost|unpkg|: any" apps/rastreamento/src` sem resultados (a exceção é `config/env.ts`, para o valor padrão de desenvolvimento).
- Criar uma entrega com `<img src=x onerror=alert(1)>` no endereço e no `descricao` de um evento (API real) e abrir no portal: o popup mostra o texto literal e nada executa.
- No DevTools: nenhuma requisição a `unpkg.com` e nenhuma violação de CSP no console.
- Derrubar a api-entregas e confirmar que a tela mostra erro com "Tentar novamente" **sem destruir o mapa**; subir de novo e confirmar a recuperação.
- Selecionar uma entrega `EM_TRANSITO` e confirmar que a posição e a timeline mudam a cada ciclo de polling; trocar de entrega e confirmar que a requisição anterior é cancelada.
- Abrir uma entrega `PENDENTE` (o `404` sem eventos) e confirmar o estado vazio, sem erro.
- Navegar por todas as telas **só com o teclado** e com um leitor de tela (NVDA), conferindo foco visível, resumo textual do mapa e anúncios.
- Conferir o contraste dos tokens com uma ferramenta (WebAIM ou o DevTools).
- Na fase 8, conferir que `GET /api/entregas?veiculo=` continua atendendo a api-frotas e que o painel-admin segue funcionando.
- Boas práticas (D9a): uma resposta fora do formato esperado (simulada com MSW) leva à tela de erro da região, e não a um erro de render; o chunk do mapa sai do bundle inicial (conferir no relatório do webpack); `grep -rnE "setInterval|class .* extends (React\.)?Component|prop-types" apps/rastreamento/src` sem resultados; nenhum `useEffect` que faça `fetch`.
- Antes de implementar o D9b, conferir na documentação oficial do React e do Nx a compatibilidade (React 19, Compiler, `@nx/vite`) com as demais dependências do workspace.
