# ADR 0003 — Evolução visual e de experiência do `painel-admin` (Angular)

- **Status:** Implementado (itens 1 a 8 do plano). Pendentes e limites conhecidos em [Resultado da implementação](#resultado-da-implementação): imagens-base visuais só do Windows, Lighthouse CI não rodado, verificação com leitor de tela real e deep link no rastreamento.
- **Data:** 2026-11-09
- **Escopo:** `rotalog-frontend` — [apps/painel-admin/](../../apps/painel-admin/). Só melhorias visuais e de experiência de uso.
- **Base:** [ADR 0001](0001-reorganizacao-seguranca-acessibilidade-painel-admin.md) (fases 1 a 8 já implementadas) e [plano-visual-painel-admin.md](../plano-visual-painel-admin.md), cujos itens ainda abertos esta ADR assume.
- **Práticas modernas:** [angular.dev](https://angular.dev). Recursos que dependem de versão (`withViewTransitions()`, `withComponentInputBinding()`, `@defer`) estão no Angular 18.2 mas **devem ser confirmados na documentação oficial antes de implementar**.
- **Relacionadas:** [ADR 0002 do rastreamento](0002-reorganizacao-seguranca-acessibilidade-rastreamento.md) (dono do mapa das entregas e de um possível deep link por pedido).
- **Fora do escopo:** o app `rastreamento` (ADR 0002), a atualização do Angular/Nx (ADR própria, ainda não escrita), qualquer mudança nas APIs e funcionalidades novas de negócio (criar manutenção, criar entrega).

## Contexto

O ADR 0001 deixou o painel organizado, acessível e testado: tokens em `styles/_tokens.css`, tema claro e escuro, componentes em `shared/ui/`, sidebar colapsável, badges com ícone e rótulo, diálogo e toast acessíveis. A base está pronta para evoluir o visual sem retrabalho.

O que o painel **ainda parece**: uma tela de CRUD funcional, mas sem leitura rápida dos dados. O dashboard tem 4 cartões numéricos, uma lista de alertas e uma tabela; as telas de lista mostram tudo de uma vez; o carregamento é uma frase ("Carregando…"). Esta ADR trata dessa distância entre "funciona e é acessível" e "ajuda a decidir".

> **Sobre o estilo local.** O `CLAUDE.md` do projeto manda não corrigir dívida técnica proativamente e seguir o estilo do módulo. O que está aqui só vale porque a evolução visual foi pedida, e deve ser feito na fase indicada, não de passagem em outras mudanças.

> **Medições.** Os números vêm de leitura do código e do build de produção (`nx build painel-admin`). Não rodei Lighthouse nem testes com usuários. Itens marcados como *a confirmar* dependem de checagem na implementação.

## Problemas identificados

### 1. Dashboard sem leitura de tendência
- Quatro cartões com contagem, sem gráfico nem comparação.
- Os **alertas são texto fixo** em [dashboard.page.ts](../../apps/painel-admin/src/app/features/dashboard/dashboard.page.ts) ("CNH do motorista João Silva vence em 5 dias", datas de março de 2026). Não refletem os dados reais.
- Os dados para alertas reais **já chegam**: `validade_cnh` (motoristas), `data_agendada` e `status` (manutenções), `status` e `tempo_estimado_minutos` (entregas).
- O mapa das entregas existe no app `rastreamento` (React), mas o painel não tem ponte para ele: quem está no dashboard não sabe que ele existe nem como chegar lá.

### 2. Listas sem paginação, busca na URL nem versão para celular
- As APIs **não paginam** (não encontrei `page`/`limit` nos controllers); o painel renderiza a lista inteira. Com muitos registros, a tela cresce sem limite.
- Busca, filtro, ordenação e item aberto vivem só em memória: recarregar a página ou copiar o link perde o contexto.
- Abaixo de ~640 px a tabela só rola na horizontal (`overflow-x: auto`); não vira cartões.
- Não há densidade configurável (confortável × compacta).

### 3. Estados de carregamento pobres
`.loading` é um texto dentro de uma caixa tracejada. A tela "pula" quando os dados chegam, e o dashboard mostra três blocos de uma vez.

### 4. Falta de rede de proteção para mudanças visuais
Há testes funcionais, de contraste dos tokens e axe, mas **nenhum teste visual**: uma mudança num token ou num componente de `shared/ui` pode estragar uma tela sem que nenhum teste falhe. Também não há catálogo dos componentes.

### 5. Detalhes de acabamento
- Troca de rota sem transição.
- Sidebar só tem dois estados (aberta em desktop; gaveta em mobile).
- Sem indicação de usuário/sessão no shell (quando a auth for ligada, ADR 0001 D5b).
- Cartões do dashboard e linhas de tabela sem estados de hover/foco "premium" além do contorno de foco.

### 6. Contratos que a evolução precisa preservar
| Contrato | Observação |
|---|---|
| Rotas do painel | `/dashboard`, `/veiculos`, `/motoristas`, `/manutencoes`, `/entregas`, `/login` e o redirect da raiz. |
| APIs | Não mudam. Paginação, filtros e alertas são feitos no cliente com o que as APIs já devolvem. |
| Acessibilidade | WCAG 2.1 AA do ADR 0001: axe sem violações sérias/críticas, teclado, contraste dos tokens. |
| Segurança | CSP, sem `innerHTML`/`bypassSecurityTrust`/`console.*`/`alert()`/`confirm()` (coberto por `seguranca.spec.ts`). |
| Suíte atual | Jest, lint, build de produção e e2e verdes a cada fase. |

## Decisão

**Decisões já tomadas (2026-11-09):**

1. **Identidade:** manter o azul com sidebar escura, refinados. Não há Figma.
2. **Densidade padrão:** confortável (a compacta fica como opção).
3. **Mapa:** não fica no painel. O mapa já existe no app `rastreamento` (React); o painel ganha só um atalho "Ver no rastreamento" (D5). A autorização de tiles externos dada antes deixa de valer para o Angular.
4. **Alertas de atraso:** sem regra de negócio (produto de teste); "entrega atrasada" e "manutenção parada" **não entram**. Ficam só os alertas calculáveis com dados reais: CNH vencida/vencendo e manutenção pendente com data passada.
5. **Reativar veículo:** aprovado; backend verificado. Só para `INATIVO`.

Evoluir em fases, **mantendo rotas, contratos de API, acessibilidade (WCAG 2.1 AA) e a suíte atual verde**. Nenhuma fase troca a stack: continua CSS puro com custom properties, componentes standalone, signals e `OnPush`.

### D1. Tokens e identidade
- **Identidade (decidido):** **manter a paleta azul e a sidebar escura, refinadas.** Não há Figma nem outra referência, então os tokens existentes são a fonte de verdade; o refinamento é de escala, elevação e estados, não de cor de marca.
- Acrescentar aos tokens, nos temas claro e escuro:
  - **Paleta categórica para gráficos** (6 cores), distinguível por daltônicos e com contraste ≥ 3:1 contra a superfície; validada em `tokens-contraste.spec.ts`, como os demais tokens.
  - **Escala de elevação** (3 níveis) e de **raios**, substituindo valores soltos que sobraram.
  - **Tokens de movimento** (`--duracao-curta`, `--easing`) já zerados por `prefers-reduced-motion`.
  - **Token de densidade** (`--densidade`: confortável/compacta) que alimenta o padding de tabela e botões.
- Tipografia: **sem trocar de fonte**; a escala em `rem` atual já serve. Se no futuro houver fonte de marca, hospedá-la localmente (CSP `font-src 'self'`, sem CDN).

### D2. Carregamento com skeleton
- Componente `app-skeleton` (`shared/ui/skeleton/`) com variantes `linha`, `cartao`, `tabela` (N linhas) e `grafico`, usando os tokens de superfície e uma animação suave de brilho, **desligada** sob `prefers-reduced-motion`.
- Substitui o texto `.loading` nas 5 telas. O skeleton é `aria-hidden`; o `role="status"` com a mensagem ("Carregando veículos…") permanece, visualmente oculta, para leitores de tela.
- O skeleton imita a **forma** do conteúdo (cabeçalho e linhas da tabela com o número real de colunas de cada tela, cartões, alertas) e acompanha a densidade (`--tabela-celula-y`). **Não** se promete ganho de CLS: medi 0,0000 nas 5 telas **antes** do skeleton, porque o carregamento fica no fim da página e a troca só adiciona elementos, o que o CLS não registra. O ganho é de percepção (progresso e forma), não da métrica.

### D3. Tabelas e listas
- **Paginação no cliente** (`app-paginator`): tamanhos 10/25/50, navegação por botões com `aria-label`, contagem "11–20 de 87" em `aria-live="polite"`. Trocar para paginação no servidor fica para quando as APIs ofereçam.
- **Estado na URL** (query params): `?q=`, `?status=`, `?ordem=placa:asc`, `?pagina=2`, `?id=` do item aberto. Usar `withComponentInputBinding()` (já disponível no Angular 18) ou `ActivatedRoute` com signals. Efeito: link copiável e botão "voltar" coerente.
- **Busca com debounce** (~250 ms) e botão "Limpar filtros" quando há filtro ativo.
- **Cartões em telas estreitas:** abaixo de ~640 px cada linha vira um cartão (`td` com `data-label`, CSS puro, sem duplicar template). A tabela continua semântica em telas largas.
- **Cabeçalho fixo** com rolagem interna, **zebra suave** e **densidade** alternável: padrão **confortável** (decidido), com a opção compacta salva em `localStorage` (com `try/catch`, como o tema).
- **Reativar veículo (aprovado):** a api-frotas tem `PATCH /veiculos/{id}/reativar` (verificado no `VeiculoController`/`VeiculoService`) e o service do painel já o expõe. O botão "Reativar" aparece **só para veículos `INATIVO`**, com diálogo de confirmação e toast. Cuidado: a API força `ATIVO` a partir de qualquer estado, inclusive `MANUTENCAO`; por isso o botão nunca aparece nesse caso.

### D4. Dashboard que ajuda a decidir
- **Alertas calculados** no lugar do texto fixo, com severidade (crítico/atenção/info) e link para a tela de origem:
  - CNH vencida ou vencendo em ≤ 30 dias (`validade_cnh`);
  - manutenção `PENDENTE` com `data_agendada` no passado;
  - veículos `INATIVO` ou em `MANUTENCAO` como indicador de disponibilidade da frota (contagem, sem regra de prazo).
  **Fora, por decisão (2026-11-09):** "entrega atrasada" e "manutenção parada há muito tempo". O produto é de teste, não há regra de negócio definida e as APIs não trazem a data de início/entrada que a calcularia. Regras que dependam de campo inexistente **não entram**; melhor menos alertas e corretos do que muitos e duvidosos.
- **Gráficos próprios**, sem biblioteca (`shared/ui/charts/`): **rosca em SVG** (frota por situação) e **barras horizontais em HTML/CSS** (manutenções por mês e entregas por status). As barras não são SVG de propósito: um SVG escalado encolhe o texto junto com a largura (no celular o rótulo ficaria ilegível), enquanto em HTML o texto mantém o tamanho em qualquer largura.
  - cada gráfico acompanha uma **tabela de dados visualmente oculta** e um `<figcaption>`, para leitores de tela e para o axe.
  Por que sem biblioteca: são 3 gráficos simples, a CSP fica restrita (`script-src 'self'`), o orçamento de bundle se mantém e as cores vêm direto dos tokens (tema escuro grátis). Se os gráficos crescerem, reavaliar Chart.js ou ngx-charts.
- **Cartões** com ícone, valor, rótulo e um **indicador secundário** (ex.: "2 pendentes"), todos como link (já são).
- **`@defer (on idle)`** nos gráficos e na tabela de últimas entregas, com o skeleton como `@placeholder`. O gatilho é `idle` e não `viewport`: o bloco ainda vira um chunk separado e sai do caminho crítico, mas não depende de rolagem (com `viewport`, testes e capturas de página inteira não disparariam o carregamento, e o usuário veria o conteúdo "surgir" ao rolar).

### D5. Atalho para o rastreamento (no lugar do mapa)
O mapa das entregas **já existe no app `rastreamento`** (React, Leaflet, `MapView`). O painel não ganha um segundo mapa; ganha uma ponte para o primeiro.
- `environment.rastreamentoUrl` (hoje `http://localhost:3001`; ajustar para o host real no deploy, como as URLs das APIs). Sem segredos.
- Botão/link **"Ver no rastreamento"** no cabeçalho do bloco de entregas do dashboard e na página de entregas (`<a target="_blank" rel="noopener">`, com indicação de que abre em nova aba). Navegar para outro site não passa pela CSP deste app: não há `img-src`, tiles nem atribuição a tratar aqui.
- **Limite conhecido:** o `rastreamento` não tem roteamento por URL (verificado: sem `useParams`/rotas), então o link abre o app, não a entrega escolhida. Um deep link (`?pedido=PED-0001`) é decisão da ADR 0002 e, se existir, o painel passa a usar nas linhas da tabela.
- **Acessibilidade:** o link tem nome acessível próprio ("Ver no rastreamento (abre em nova aba)") e contraste de link normal.

### D6. Shell e acabamento
- **Sidebar em modo ícones** no desktop (recolhe para ~4 rem, com `aria-label` e tooltip acessível em cada item); estado salvo como preferência.
- **Transição de rota** com `withViewTransitions()` do router (disponível no Angular 18), desativada sob `prefers-reduced-motion`.
- **Área do usuário** no rodapé da sidebar (nome e "Sair") preparada para a auth ligada; invisível enquanto `autenticacao.ativa` for `false`.
- Estados de hover/foco/ativo refinados nos cartões e nas linhas; toasts e diálogo com entrada/saída suave.
- Título da página (`<h1>`) e `document.title` por rota já existem; acrescentar **breadcrumb** só se houver telas de segundo nível (hoje não há).

### D7. Catálogo e regressão visual
- **Storybook** (versão compatível com Angular 18, *a confirmar na documentação*) com uma story por componente de `shared/ui/` e por estado (normal, foco, erro, vazio, skeleton), nos dois temas. Serve de catálogo e de base para a revisão de design.
- **Testes de regressão visual** com `toHaveScreenshot()` do Playwright: 5 telas × 2 temas × 3 larguras (mobile, tablet, desktop), com as APIs mockadas (`fixtures.ts`).
  - Risco conhecido: as imagens-base dependem de SO e fonte. As bases devem ser geradas **no mesmo ambiente do CI** (container fixo), não na máquina de cada pessoa; localmente roda-se só `--project=chromium`.
  - A fase 1 captura as telas **antes** de qualquer mudança, para termos o "antes/depois".

### D8. Acessibilidade e desempenho como critérios de aceite
- Cada tela nova ou alterada passa no **axe** (zero violações sérias/críticas) e na navegação só por teclado, como no ADR 0001.
- Gráficos: tabela alternativa, nenhuma informação só por cor, contraste ≥ 3:1 nos elementos gráficos.
- **Desempenho:** hoje o carregamento inicial é ≈ 307 kB brutos (≈ 86 kB transferidos). Meta: manter o inicial < 500 kB (orçamento atual); gráficos só em chunks lazy. (CLS não entra como critério: ver D2.) Lighthouse CI é opcional, como no ADR 0001.

## Alternativas consideradas

| Alternativa | Motivo da rejeição / adiamento |
|---|---|
| Angular Material ou PrimeNG para o visual novo | Troca a linguagem visual inteira, adiciona dependência grande e conflita com os tokens já feitos. **Adiado**: só se a manutenção de `shared/ui` ficar cara. |
| Chart.js / ngx-charts / ECharts | Resolvem gráficos complexos, mas pesam no bundle e pedem cuidado com a CSP e com o tema escuro. Para 3 gráficos simples, SVG próprio basta. **Reavaliar** se surgirem séries temporais, zoom ou interação. |
| Mapa no dashboard (Leaflet) | O `rastreamento` (React) já tem o mapa; um segundo duplicaria a funcionalidade e traria custos só para o painel (tiles externos, CSP, atribuição, IP exposto a terceiros). **Rejeitado** em 2026-11-09 em favor de um atalho (D5). |
| Compartilhar o mapa entre os dois apps numa lib | Exigiria mexer no `rastreamento`, que está em execução na ADR 0002. **Adiado.** |
| Paginação e filtro no servidor | As APIs não oferecem. **Adiado** até haver contrato (e fica alinhado às ADRs das APIs). |
| Redesenho completo da identidade agora | Sem referência, vira gosto pessoal e dificulta a revisão. **Condicionado** à resposta sobre identidade. |
| Tailwind ou SCSS | Sem ganho claro sobre custom properties já adotadas (mesma conclusão do ADR 0001). **Rejeitado.** |
| Testes visuais só manuais | Não detectam regressões entre fases. **Rejeitado**; D7. |
| Atualizar o Angular junto com o visual | Mistura upgrade e redesenho. Segue em ADR própria. **Adiado.** |

## Consequências

**Positivas**
- Leitura rápida do estado da frota e alertas verdadeiros em vez de texto fixo.
- Listas que escalam (paginação), com links copiáveis e boa aparência no celular.
- Sensação de progresso (skeleton com a forma da tela) e de acabamento (transições, estados).
- Mudanças visuais futuras passam a ter rede de proteção (Storybook e regressão visual).

**Negativas / riscos**
- Mais componentes em `shared/ui` (skeleton, paginator, 3 gráficos) para manter.
- Imagens-base de regressão visual exigem ambiente fixo; sem isso geram falsos positivos.
- Paginação no cliente não reduz o tráfego, só a renderização.
- Alertas calculados no cliente refletem apenas os campos que as APIs entregam; algumas regras desejáveis ficam de fora até as APIs mudarem.

**Não muda**
- Rotas, contratos de API, Angular 18 / Nx 19, a ausência de biblioteca de UI e as regras de segurança do ADR 0001 (CSP, sem `innerHTML`, sem `console`).

## Plano de implementação

Cada fase é um PR/commit independente e só começa com a anterior verde (`nx lint test build` e e2e).

> **Andamento (2026-11-09):** itens 1 a 8 concluídos. O resultado de cada item, os números finais e o que ficou de fora estão em [Resultado da implementação](#resultado-da-implementação).

1. **Linha de base:** capturas das 5 telas × 2 temas × 3 larguras ("antes"); Storybook com os componentes atuais; CI fixo para as imagens-base (opcional).
2. **Tokens (D1):** paleta de gráficos, elevação, movimento, densidade; testes de contraste dos novos tokens. Identidade mantida (decisão 1).
3. **Skeleton (D2):** `app-skeleton` e troca nas 5 telas.
4. **Tabelas (D3):** `app-paginator`, estado na URL, debounce, cartões em telas estreitas, densidade, cabeçalho fixo; "Reativar" para veículos INATIVO.
5. **Dashboard (D4):** alertas calculados (CNH e manutenção pendente atrasada), rosca em SVG e barras em HTML/CSS com tabela alternativa, `@defer (on idle)`.
6. **Atalho para o rastreamento (D5):** `environment.rastreamentoUrl` e o link no dashboard e na tela de entregas.
7. **Shell e acabamento (D6):** sidebar em modo ícones, view transitions, área do usuário, estados de hover/foco.
8. **Fechamento (D7/D8):** regressão visual completa, axe em todas as telas, orçamento de bundle conferido, ADR atualizada.

## Resultado da implementação

Implementado em 2026-11-09, em itens independentes, cada um só começando com o anterior verde. A numeração abaixo é a do **Plano de implementação**. Comandos úteis: `npm run storybook` e `npm run build-storybook` (catálogo), `npm run e2e` (funcional; com `-- --project=chromium` se Firefox e WebKit não estiverem instalados), `npm run e2e:visual` e `npm run e2e:visual:update` (regressão visual) e `npm run typecheck` (o Jest não checa tipos).

### Item 1 — Linha de base (D7)
Storybook 8.6.18 (declara suporte a Angular 15 a 19, confirmado) com 19 stories em 9 componentes de `shared/ui`, alternância de tema na barra de ferramentas e addon de acessibilidade: `npm run storybook` e `npm run build-storybook`. Todas as stories foram abertas no navegador nos dois temas, sem erro de console. O build do catálogo roda **sem minificação** (`webpackFinal` em `.storybook/main.ts`), porque a minificação apaga o nome das classes e o painel de controles falha com "Invalid component undefined". Linha de base visual: `apps/painel-admin-e2e/src/visual.spec.ts` (5 telas × 2 temas × 3 larguras, 30 imagens, APIs mockadas) em um projeto Playwright `visual` fora da suíte padrão: `npm run e2e:visual` compara e `npm run e2e:visual:update` aceita mudanças. **Limite:** as imagens-base foram geradas no Windows (`*-win32.png`); o CI precisa gerar as suas no próprio ambiente (Linux/container fixo) antes de usar a comparação como critério de PR. Também entrou `npm run typecheck` (`tsc` sobre app, spec, Storybook e e2e), que o Jest não substitui por não checar tipos.

### Item 2 — Tokens (D1)
em `styles/_tokens.css`, paleta de gráficos `--grafico-1` a `6` (claro e escuro; contraste ≥ 3:1 contra superfície e fundo, ΔE ≥ 15 entre qualquer par sob protanopia, deuteranopia e tritanopia, calculado com as matrizes de Machado), escala de elevação `--elev-1` a `3` (`--sombra-card` e `--sombra-alta` viraram apelidos), raio `--raio-md`, tokens de movimento (`--duracao-curta`, `--duracao-media`, `--easing`, zerados por `prefers-reduced-motion`) e densidade (`--densidade`, `data-densidade="compacta"` no `<html>`; alvo de clique nunca abaixo de 2,25rem). Confortável é o padrão e mantém as medidas anteriores: **os 30 testes visuais passaram sem nenhuma diferença de pixel**. Os 30 testes novos em `tokens-contraste.spec.ts` foram verificados por mutação (uma paleta ruim faz 5 falharem). Storybook ganhou 4 stories de tokens (`Design/Tokens`) e o seletor de densidade na barra de ferramentas (23 stories, todas abertas nos dois temas). **Limite:** a densidade só reage ao `<html>`, não a um trecho da página, porque os tokens derivados são calculados no `:root`; o botão para o usuário trocar a densidade é da fase 4.

### Item 3 — Skeleton (D2)
`app-skeleton` (`shared/ui/skeleton/`, variantes linha, cartão, estatísticas, tabela e gráfico) no lugar do "Carregando…" nas 5 telas; o desenho é `aria-hidden` e o anúncio é um `role="status"` visualmente oculto (no dashboard, um só para as três peças); o brilho não anima com `prefers-reduced-motion`; tokens `--skeleton-base`, `--skeleton-brilho` e `--duracao-skeleton`; o CSS do antigo `.loading` saiu. 8 testes unitários, 13 e2e (axe nos dois temas, anúncio, desenho escondido, sem animação com movimento reduzido) e 7 stories (30 no catálogo). **Correção importante nos testes visuais:** a tolerância da fase 1 (`maxDiffPixelRatio: 0.01` com o `threshold` padrão) deixava passar mudanças reais, como trocar a caixa de carregamento por um cartão com barras cinza-claras (só 4 de 20 imagens foram detectadas). Passou a `threshold: 0.02` e `maxDiffPixels: 0`: tolera o antialiasing de 1/255 nos cantos arredondados, mas pega trocas sutis. Calibrado nos dois sentidos: o estado carregado (30 imagens, linha de base da fase 1) **passa**, e o "antes" do carregamento falha nas 20. Com isso, as afirmações das fases 2 e 3 de que as telas carregadas não mudaram ficam confirmadas com o critério certo. A linha de base de carregamento (20 imagens: 5 telas × 2 temas × mobile e desktop, em `visual-carregando.spec.ts`) foi regenerada com o skeleton.

### Item 4 — Tabelas e listas (D3)
em veículos, motoristas, entregas e manutenções. (1) **Estado na URL** (`core/url-state/estado-na-url.ts`): `?q=`, `?status=`, `?ordem=placa:asc`, `?pagina=`, `?tam=` e `?id=` (item aberto); o signal atualiza na hora e acompanha o "voltar" do navegador; valores inválidos caem no padrão; busca troca a entrada do histórico, página e item aberto empilham. (2) **Paginação no cliente** (`app-paginator`, 10/25/50): faixa "11–20 de 57" numa região `aria-live="polite"`, controles só quando há mais de 10 itens, página além do fim cai na última. (3) **Busca com debounce** de 250 ms e **"Limpar filtros"** (só com filtro ativo). (4) **Cartões abaixo de 40rem**: `td` com `data-label` (também no dashboard); o cabeçalho some e a ordenação passa para um seletor "Ordenar por" (só existe no celular). (5) **Zebra suave** (`--cor-zebra`) e **cabeçalho fixo** apenas quando `[rolavel]` (páginas de 25 ou 50): com 10 linhas a tabela cresce e a página rola. (6) **Densidade**: `DensityService` + botão "Modo compacto" (`aria-pressed`, preferência em localStorage) na barra de filtros das listas. (7) **Reativar veículo**: só para INATIVO, com diálogo e toast; nunca aparece em MANUTENCAO, porque a API força ATIVO a partir de qualquer estado; "Desativar" no lugar do botão desabilitado. 82 testes novos (unitários e e2e, inclusive axe nas 4 listas em desktop e celular, nos dois temas e no modo compacto) e 8 stories (38 no catálogo). A linha de base visual foi atualizada de propósito: 26 das 30 capturas das telas carregadas mudaram (as 4 listas e o dashboard no celular), o dashboard em desktop e tablet ficou idêntico, e há 7 capturas novas das listas paginadas, em cartões e no modo compacto (`visual-listas.spec.ts`). **Limites conhecidos:** ao virar cartão, a tabela perde a semântica de tabela para leitores de tela em alguns navegadores (o rótulo de cada célula vem de `::before`, que a maioria lê); os cartões e a ordenação por seletor no celular foram testados com axe e Chromium, não com leitor de tela real; a paginação não reduz o tráfego, só a renderização (as APIs não paginam).

### Itens 5 e 6 — Dashboard (D4) e atalho para o rastreamento (D5)
(1) **Alertas calculados** (`features/dashboard/dashboard.dados.ts`, funções puras com "hoje" injetável): CNH vencida (crítico) ou a vencer em até 30 dias (atenção; motorista inativo não conta), manutenção pendente com data passada (atenção, com a placa do veículo) e frota em manutenção/inativa (informativo). Cada alerta é um link para a lista de origem **já filtrada** (usa o estado na URL da fase 4), ordenam por gravidade e depois pela data mais antiga, o dashboard mostra os 6 primeiros e avisa "e mais N alertas"; severidade também em texto ("Crítico:"), nunca só emoji ou cor. O texto fixo antigo saiu. "Entrega atrasada" e "manutenção parada" continuam de fora, como decidido. (2) **Gráficos**: rosca da frota, barras de manutenções por mês (6 meses mais recentes) e de entregas por status, com a paleta validada da fase 2, rótulos em pt-BR vindos do `STATUS_CONFIG`, legenda com valor e percentual, `figcaption` com o total e **tabela de dados visualmente oculta** (o desenho é `aria-hidden`); concordância ("1 veículo"). (3) **Cartões** com indicadores (em manutenção, de férias, CNH vencida ou a vencer, atrasadas) e concordância no singular. (4) **Atalho "Ver no rastreamento"** (`environment.rastreamentoUrl`, nova aba, `rel="noopener noreferrer"`, aviso para leitor de tela) no dashboard e na tela de Entregas; o código de cada entrega do dashboard abre a lista com a entrega já aberta (`?id=`). (5) `@defer` (ver D4) e esqueleto do dashboard com a forma real da tela. 76 testes novos (23 da lógica de alertas e agregações, 17 dos gráficos, 12 da página, 20 e2e com relógio fixo e axe nos dois temas e em desktop e celular) e 8 stories (46 no catálogo). A linha de base visual do dashboard (12 capturas, mais 6 novas do "dashboard cheio" em `visual-dashboard.spec.ts`) e de entregas foi atualizada de propósito; as demais telas ficaram idênticas, o que foi verificado antes de atualizar. Os testes visuais agora fixam o relógio em 09/11/2026 e esperam os blocos adiados. **Limites conhecidos:** o mapa continua no app `rastreamento` (o painel só aponta para ele, sem deep link até a ADR 0002 aceitar a entrega na URL); os alertas dependem do relógio do navegador; "Manutenções por mês" usa a data agendada, porque a API não separa agendada de realizada.

### Item 7 — Shell e acabamento (D6)
(1) **Menu recolhido** no desktop (só ícones, 72 px), com o conteúdo acompanhando a largura (`--largura-sidebar-recolhida`), alternado por um botão com `aria-expanded`/`aria-controls`, funcionando por teclado e lembrado em localStorage (`SidebarStateService`, atributo `data-sidebar` no `<html>`); no celular a gaveta não é afetada. (2) **Dicas acessíveis** nos ícones, na vista e por foco de teclado, **dispensáveis com Esc** e persistentes ao mover o ponteiro até elas (WCAG 1.4.13); o nome acessível de cada controle continua sendo o texto do rótulo, só escondido da vista. (3) **Transição entre rotas** com `withViewTransitions()`, só no conteúdo (`view-transition-name: conteudo`; a sidebar não pisca), pulada com `prefers-reduced-motion` e na primeira carga. (4) **Área do usuário** no rodapé do menu (inicial, nome vindo do token como texto e "Sair"), invisível enquanto a autenticação estiver desligada, coberta por testes unitários porque o e2e roda com a auth desligada. (5) **Acabamento:** entrada suave de toast e de diálogo (e do fundo do diálogo), botão pressionado afunda 1 px, cartão do dashboard levanta também com o foco por teclado, linha de tabela destaca o foco interno. Breadcrumb não entrou (não há telas de segundo nível). 42 testes novos (unitários e 19 e2e, inclusive axe do menu recolhido e da dica nos dois temas) e 6 capturas visuais novas (`visual-shell.spec.ts`). **Verificação por pixels:** das 39 capturas existentes que mudaram, em todas a diferença ficou na região da sidebar; fora dela só restaram 4 pixels com diferença de 1/255 (antialiasing). **Problemas achados e corrigidos:** (a) com a transição ligada, cada navegação passou a durar a animação e dois cliques rápidos em "Próxima" cancelavam a primeira, perdendo uma entrada do histórico; mudanças só de query (página, filtro, item aberto) agora não animam; (b) minha primeira correção comparava o caminho do snapshot raiz (sempre vazio) e pulava todas as transições, o que um teste novo pegou; (c) o CSS da sidebar passou de 3,98 kB (limite de erro 4 kB) e o do menu recolhido foi para o CSS global (`styles/shell.css`). **Limites conhecidos:** a animação de **saída** de toast e diálogo não existe (o Angular 18 remove o elemento do DOM sem animar a saída; só a entrada anima); com o menu recolhido a lista de itens não rola (a rolagem cortaria as dicas), o que só importaria em janelas muito baixas; as View Transitions dependem do navegador (sem suporte, a navegação segue sem animação).

### Item 8 — Fechamento (D7/D8)
- **Cobertura de acessibilidade completa** (`axe-completo.spec.ts`, 52 testes, WCAG 2.0, 2.1 e 2.2 níveis A e AA, nos dois temas): página 404, as 5 telas com a API fora do ar (banner de erro), sem dados (estado vazio) e em tablet (768 px), formulário de motorista vazio e com erros, formulário de veículo em edição, painéis de detalhe abertos por link, diálogo de confirmação, toast, gaveta do menu aberta no celular, menu recolhido com a dica visível, **reflow a 320 px** (WCAG 1.4.10) nas 5 telas e **texto a 200%** (WCAG 1.4.4). Somados aos specs anteriores, todas as telas e estados relevantes passam com **zero violações sérias ou críticas**.
- **Dois defeitos reais que essa cobertura achou e foram corrigidos:** (1) o botão "Tentar novamente" do banner de erro usava texto branco fixo sobre `--cor-perigo`, que no tema escuro é um rosa claro (contraste 2,28:1, afetava as 5 telas); a regra `.error-banner button` foi removida e o botão usa `btn btn--secondary btn--sm`; (2) as **tabelas ocultas dos gráficos** (`<table class="visually-hidden">`) estouravam a página a 320 px, porque uma `<table>` ignora o `width: 1px` do utilitário e mantém a largura natural (302 px); agora ficam dentro de um `<div class="visually-hidden">`, que é quem recorta.
- **Regressão visual:** 69 capturas (30 telas carregadas, 20 carregando, 7 listas paginadas e compactas, 6 dashboard cheio, 6 menu), comparação quase exata (`threshold: 0.02`, `maxDiffPixels: 0`), estáveis em repetição.
- **Segurança:** o `grep` de `innerHTML|bypassSecurityTrust|console.|alert(|confirm(` só encontra comentários em dois services; o `seguranca.spec.ts` ignora comentários e passa.

### Números finais
| Verificação | Resultado |
|---|---|
| Jest (`nx test painel-admin`) | 321 testes em 22 suítes |
| Playwright funcional (Chromium) | 176 testes, incluindo axe |
| Regressão visual | 69 capturas |
| Storybook | 46 stories, todas abertas nos dois temas sem erro |
| Lint, build de produção, `typecheck` (TS 5.5 do projeto e TS 6) | sem erros nem avisos de orçamento |
| Carregamento inicial | **340,32 kB brutos / 96,56 kB transferidos** (início do ADR: 306,77 / 86,39), 68% do orçamento de 500 kB |
| Gráficos | chunks lazy de 3,0 kB (rosca) e 2,2 kB (barras) |
| CLS | 0 já no início; não é critério (ver D2) |

O crescimento de ≈ 34 kB no carregamento inicial vem do que o ADR entregou (paginação, estado na URL, densidade, esqueleto, menu, transições e a lógica do dashboard), sem biblioteca nova de UI ou de gráficos.

### O que ficou de fora ou é limite conhecido
- **Imagens-base visuais só do Windows** (`*-win32.png`). Como não há CI, nada as gera no ambiente de integração; antes de a comparação virar critério de PR, gerar as imagens no CI (Linux, container fixo).
- **Sem CI.** Lint, testes, build, e2e, axe e `typecheck` rodam à mão. O **Lighthouse CI** (opcional no ADR) não foi rodado: o dashboard depende das 3 APIs e não há como medi-lo sem elas ou sem um mock no navegador.
- **E2E só em Chromium.** O `playwright.config.ts` ainda lista Firefox e WebKit, cujos navegadores não estão instalados nesta máquina.
- **Verificações manuais não feitas:** leitor de tela real (NVDA) e conferência de contraste com ferramenta externa (o axe e o cálculo dos tokens cobrem o automático). Em telas estreitas a tabela vira cartões e perde a semântica de tabela em alguns navegadores; o rótulo de cada célula vem de `::before`.
- **Autenticação ligada sem e2e** (o ambiente é fixo no build); só testes unitários cobrem login, guard, interceptor e a área do usuário.
- **Alertas "entrega atrasada" e "manutenção parada"** não existem: sem regra de negócio nem a data de início/entrada nas APIs.
- **Mapa:** continua só no `rastreamento`. O atalho abre o app, não a entrega escolhida; um deep link depende da ADR 0002.
- **Animação de saída** de toast e diálogo não existe (o Angular 18 remove o elemento sem animar a saída). View Transitions dependem do navegador; sem suporte, a navegação segue sem animação.
- **Paginação no cliente:** reduz a renderização, não o tráfego; as APIs não paginam.
- **Storybook** sem minificação no build (a minificação apaga o nome das classes e quebra o painel de controles) e só com os componentes de `shared/ui`, não com as páginas.
- **Atualização do Angular/Nx** (zoneless, `httpResource`, Signal Forms): continua em ADR própria, ainda não escrita.
- **Documentação do projeto:** o `CLAUDE.md` da raiz ainda descreve o painel como antes das refatorações (templates inline, `fetch`, `models/index.ts`); vale atualizar.

## Verificação (quando for implementar)
- `npx nx lint painel-admin`, `npx nx test painel-admin` e `npx nx build painel-admin --configuration=production` verdes, sem estourar `initial` (500 kB) nem `anyComponentStyle` (4 kB).
- `npx nx e2e painel-admin-e2e` (`--project=chromium`) com axe sem violações sérias/críticas nas telas novas e nos dois temas.
- Contraste dos tokens de gráfico coberto por `tokens-contraste.spec.ts`; conferir também com ferramenta externa (WebAIM ou DevTools).
- Regressão visual: comparar com a linha de base da fase 1 e aprovar cada diferença intencional.
- Navegar **só pelo teclado** e com leitor de tela (NVDA): paginador, filtros na URL e gráficos (tabela alternativa); o atalho "Ver no rastreamento" deve ser focável e abrir em nova aba com `rel="noopener"`.
- Com `prefers-reduced-motion`, confirmar que skeleton, transições e toasts não animam.
- Redimensionar de 320 px a 1920 px e conferir cartões, sidebar e gráficos sem rolagem horizontal da página.
- Derrubar uma API e confirmar que dashboard e gráficos mostram erro (não zeros nem vazio).
- Confirmado na implementação: Storybook 8.6.18 declara suporte a Angular 15 a 19; `withViewTransitions()` funciona no 18.2 (verificado no Chromium, com testes de transição e de movimento reduzido). `withComponentInputBinding()` não foi necessário: o estado das listas usa `ActivatedRoute` com signals (`core/url-state/estado-na-url.ts`).
- `grep -rnE "innerHTML|bypassSecurityTrust|console\.|alert\(|confirm\(" apps/painel-admin/src` sem resultados **fora de comentários** (o `grep` simples ainda acha duas menções em comentários; o `seguranca.spec.ts` as ignora e é o critério).
