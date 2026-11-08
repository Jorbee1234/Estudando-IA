# Acessibilidade (meta: WCAG 2.2 nível AA)

Checklist de critérios → onde/como são atendidos. Verificação automática: `npm run lint` (jsx-a11y via oxlint), `npm test` (contraste dos tipos) e `npm run test:e2e` (axe com tags `wcag2a/aa`, `wcag21a/aa`, `wcag22aa` no dashboard e no drawer).

| Critério | Como é atendido | Onde |
|---|---|---|
| 1.1.1 Conteúdo não textual | Sprite do drawer tem `alt` descritivo; no card o `alt` é vazio porque o nome já está no texto do link; Pokébolas/partículas são `aria-hidden` | `PokemonDrawer`, `PokemonCard`, `PokeballLoader`, `GoldenParticles` |
| 1.3.1 Informação e relações | HTML semântico (`header`, `main`, `ul/li`, `fieldset/legend`, `label`, `dl`), um `h1`, hierarquia de headings | `AppHeader`, `DashboardPage`, `FilterChips` |
| 1.4.1 Uso de cor | Tipo sempre com texto + ícone; seleção de chip usa `aria-pressed` + preenchimento | `TypeBadge`, `FilterChips` |
| 1.4.3 / 1.4.11 Contraste | Texto sobre cor de tipo é calculado (`readableOn`) e testado ≥ 4.5:1; tokens de texto ≥ 7:1; foco ≥ 3:1 | `shared/lib/color.ts`, `color.test.ts`, `global.scss` |
| 1.4.4 / 1.4.10 Redimensionar / Reflow | Unidades `rem`, grid fluido `auto-fill`, sem scroll horizontal em 320px | `PokemonGrid.module.scss` |
| 1.4.13 Conteúdo em hover/foco | Tooltip abre em hover **e** foco, é "hoverable", fecha com ESC | `shared/ui/Tooltip` |
| 2.1.1 / 2.1.2 Teclado | Tudo operável por teclado; focus trap no drawer sem armadilha (ESC sai) | `shared/a11y/useFocusTrap`, `Tabs` |
| 2.2.2 / 2.3.1 Movimento e flashes | Sem auto-play; partículas lentas e suaves; pulsos só com `prefers-reduced-motion: no-preference` | `GoldenParticles`, `_mixins.scss` |
| 2.4.1 Bypass blocks | Link "Pular para o conteúdo" | `DashboardPage` |
| 2.4.2 Título | `document.title` muda ao abrir um Pokémon | `useDocumentTitle` |
| 2.4.3 Ordem de foco | Foco vai ao diálogo ao abrir e **retorna ao card** ao fechar; fundo `inert` | `useFocusTrap`, `DashboardPage` |
| 2.4.7 / 2.4.11 Foco visível | `:focus-visible` com anel de alto contraste em todos os controles | `_mixins.scss` (`focus-ring`) |
| 2.5.8 Tamanho do alvo | Alvos ≥ 44px nos controles principais (mínimo exigido: 24px) | `touch-target` mixin |
| 3.1.1 / 3.1.2 Idioma | `<html lang="pt-BR">`; nomes/efeitos vindos da API marcados com `lang="en"` | `index.html`, componentes |
| 3.3.2 Rótulos | Busca com `<label>`; filtros com `legend`/`label` visíveis | `AppHeader`, `GenerationFilter` |
| 4.1.2 Nome, função, valor | WAI-ARIA Tabs, `role="dialog"` + `aria-modal`, `aria-pressed`, `role="meter"` com `aria-valuetext` | `Tabs`, `PokemonDrawer`, `StatBars` |
| 4.1.3 Mensagens de status | `role="status"` anuncia contagem carregada, loading e grito tocando; `role="alert"` em erros | `PokemonGrid`, `QueryState`, `CryButton` |

## Movimento e preferências
- `prefers-reduced-motion` do sistema **e** o botão "Reduzir animações" (persistido) desativam tilt, shared-element, pulsos, partículas e transições CSS (`data-reduce-motion` na raiz + `MotionConfig`).
- `prefers-color-scheme` (claro/escuro) e `prefers-contrast: more` são respeitados via variáveis CSS.
- Sons de interface podem ser desligados (persistido); o grito do Pokémon só toca por ação explícita.

## Checagem manual recomendada (antes de cada release)
1. Navegar só com teclado (Tab/Shift+Tab/setas/ESC): grid → drawer → abas → evolução → fechar.
2. Leitor de tela (NVDA no Windows): card, drawer, abas, stats (`meter`), contagem de resultados.
3. Zoom 200% e viewport de 320px.
4. Ativar `prefers-reduced-motion` e o modo Shiny: nada pisca nem se move excessivamente.
