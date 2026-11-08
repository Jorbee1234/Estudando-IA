# Pokédex

Frontend de uma Pokédex imersiva consumindo a [PokéAPI](https://pokeapi.co/). React + TypeScript + Vite, SCSS (CSS Modules), Framer Motion e TanStack Query, organizado por **domínios** (DDD). Meta de acessibilidade: **WCAG 2.2 AA** ([docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md)).

## Rodando

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + build de produção
npm run lint         # oxlint (inclui jsx-a11y)
npm test             # unitários (Vitest)
npm run test:e2e     # Playwright + axe (sobe o dev server sozinho)
```

Na primeira vez: `npx playwright install chromium`.

## Funcionalidades
- Grade de cards com tilt/zoom, scroll infinito (+ botão "Carregar mais"), skeletons de Pokébola.
- Busca com debounce, filtros por tipo e geração (gerados pela API); filtros ficam na URL.
- Fundo adaptativo à cor do tipo do Pokémon em foco.
- `/pokemon/:id` abre um drawer modal com transição de elemento compartilhado: visão geral (grito, radar e barras de atributos animados), habilidades (tooltips) e golpes filtráveis, linha evolutiva clicável (suporta ramificações como Eevee).
- Sons de menu sintetizados (Web Audio), modo Shiny com tema e partículas douradas, opção "Reduzir animações".

## Arquitetura

```
src/
  app/        providers (Query, tema, som) e rotas
  pages/      DashboardPage, AppHeader, useCatalogFilters
  shared/     kernel sem regra de negócio: config, api, i18n, hooks, a11y, lib, styles, ui genérica
  domains/
    pokemon/ type/ generation/ ability/ evolution/ theme/
      domain/          entidades e regras puras
      infrastructure/  chamadas à PokéAPI + DTO → domínio (única fronteira com o JSON cru)
      application/     hooks do TanStack Query
      presentation/    componentes React
      index.ts         API pública do domínio (outros domínios só importam por aqui)
```

Princípios: **sem dados mockados** (tipos, gerações, stats, golpes e evoluções vêm sempre da API); componentes genéricos em `shared/ui` (`DataList`, `QueryState`, `Tabs`, `FilterChips`, `Radar`…) recebem dados e só renderizam; cada card/painel tem skeleton com o mesmo layout.
