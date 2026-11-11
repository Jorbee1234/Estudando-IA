# ADR 0004 — Evolução visual e de experiência do `rastreamento` (React)

- **Status:** Implementado, fases 1 a 7 e 9 (2026-11-09). **Fase 8 (tema escuro, D9) não feita**: era opcional e dependia de aprovação. Pendentes: conferência de contraste com ferramenta externa e teste com leitor de tela (NVDA); os textos de orientação (D2, D6) aguardam aprovação do produto.
- **Data:** 2026-11-09
- **Escopo:** `rotalog-frontend` — [apps/rastreamento/](../../apps/rastreamento/). Só melhorias visuais e de experiência de uso do portal público.
- **Base:** [ADR 0002](0002-reorganizacao-seguranca-acessibilidade-rastreamento.md) (fases 1 a 8 implementadas), de que esta ADR herda os tokens, os componentes `ui/` e os critérios de acessibilidade e segurança.
- **Fora do escopo:** o `painel-admin` (a evolução visual dele está na [ADR 0003](0003-evolucao-visual-painel-admin.md)), a atualização do React e do Nx (ADR própria, ainda não escrita), qualquer mudança nas APIs e nas regras de negócio.

> **Medições.** Os números vêm de leitura do código. **Não abri o portal rodando** nem fiz captura de tela; a fase 1 existe para isso. Itens marcados como *estimativa* precisam de confirmação na implementação.

## Contexto

Depois da ADR 0002 o `rastreamento` tem estrutura, segurança e acessibilidade em ordem, mas o visual continua o do app original, só reorganizado: uma barra verde no topo, uma coluna lateral de 20 rem com um único campo de busca, um painel de detalhes com grade de rótulo e valor, e o mapa. O portal é público e é a cara do produto para quem espera uma entrega. Esta ADR trata só da aparência e do fluxo de uso, **sem trocar API, dependência de dados nem regra de negócio**.

Restrições que valem para todas as decisões:
- **Não regredir** o que já está testado: rótulos e nomes acessíveis, `axe` sem violações, foco visível, popups sem HTML, mapa criado uma vez. Os 33 testes atuais devem continuar passando; mudar um texto exige mudar o teste junto, de propósito.
- **CSP** atual: `default-src 'self'`, imagens só de `self`, `data:` e `*.tile.openstreetmap.org`. Fonte, ícone ou estilo novo vem do pacote npm e do bundle, nunca de CDN.
- Contraste ≥ 4,5:1 (texto) e ≥ 3:1 (componentes), conferido com ferramenta (pendência da ADR 0002).
- Sem biblioteca de componentes de UI (mesma linha da ADR 0003 do painel).

## Problemas e oportunidades

### 1. Primeira tela vazia
Antes da busca o usuário vê uma barra lateral quase vazia, um painel com "Informe o número de um pedido" e um mapa sem nada. A ação principal (digitar o número) está num canto, com o mesmo peso visual de tudo o resto, e não há exemplo de formato nem orientação de onde achar o número.

### 2. Resultado com cara de formulário
O painel mostra `dl` em duas colunas, uma barra de progresso fina e a timeline como linhas de texto. O status, que é a resposta que o visitante quer, é um badge pequeno entre outros campos. Não há noção de etapas: "60%" para `EM_TRANSITO` é deduzido do status (limite conhecido, FIXME da ADR 0002), e a barra não diz o que vem depois. `CANCELADA` aparece como 0% de progresso, o que passa uma ideia errada.

### 3. Layout que desperdiça espaço
A coluna lateral de 20 rem existe só para o campo de busca. Em telas largas o mapa e os detalhes ficam com menos espaço do que poderiam; em telas estreitas (um único `@media` em 768 px) tudo empilha e o mapa vai para o fim da página, longe da tela inicial.

### 4. Identidade pouco definida
- A fonte `Inter` está no `--fonte`, mas **não é carregada** em lugar nenhum; na prática vale a fonte do sistema.
- Ícones são emojis (⏳ 📋 🚚 ✅ ⛔ 📦 🏁), que mudam de aparência por sistema operacional.
- Um verde só (`--cor-primaria`), sombras e raios pouco usados, hierarquia de títulos fraca.

### 5. Mapa genérico
Marcadores são círculos coloridos com emoji; origem e destino se diferenciam por cor e emoji. A rota percorrida e a restante têm pouca diferença visual, não há legenda e os controles de zoom são os padrão do Leaflet.

### 6. Estados e transições sem desenho
Carregando é "Buscando pedido..." em texto; "não encontrado" e "erro" são caixas de texto. Nada de skeleton, nada de ícone, nenhuma transição ao trocar de estado.

### 7. Pedido não vive na URL
O número consultado fica só no estado do React. Não dá para compartilhar o link de um rastreio, recarregar a página sem perder a consulta nem abrir o portal já no pedido a partir de outro lugar. A ADR 0003 (D5) registra exatamente esse limite: o link do painel-admin abre o app, mas não a entrega.

### 8. Sem rede de proteção visual
Não existe projeto e2e do `rastreamento` (pendência da ADR 0002) e nenhum teste de captura de tela. Qualquer mudança de CSS pode quebrar o layout sem que algo falhe.

## Decisão

Evoluir em fases pequenas, **mantendo os dados, os endpoints e os testes de comportamento**. As decisões abaixo são propostas; o que depende de escolha está em "Decisões a tomar".

### D1. Fundação: tokens, tipografia e ícones
- **Tokens ampliados** em `styles/tokens.css`: escala de cinzas, estados semânticos (sucesso, alerta, perigo, info), 2 elevações, 3 raios, escala de espaçamento e de tipografia em `rem`. Nenhuma cor solta nos módulos CSS.
- **Fonte Inter empacotada** pelo npm (`@fontsource-variable/inter`, só o subconjunto latino) e servida de `self`, o que cabe na CSP atual. Tem custo de bytes (*estimativa*: algumas dezenas de kB), por isso `font-display: swap` e *preload* da fonte principal.
- **Ícones SVG próprios** em `components/ui/icons/` (≈ 10: status, origem, destino, caminhão, busca, alerta, relógio, mapa, lista), com `aria-hidden="true"` quando decorativos. Sem biblioteca de ícones. Substituem os emojis em badge, timeline e dashboard.
- `StatusBadge` passa a usar os ícones SVG; o `STATUS_CONFIG` continua a única fonte de rótulo e cor, e ganha o ícone como campo.

### D2. Tela inicial que guia
Sem pedido consultado, a área principal mostra uma **tela de entrada** centralizada: título, uma frase curta, o campo de busca grande, o exemplo do formato (`PED-001`) e uma linha dizendo onde achar o número ("no e-mail ou SMS da compra"; texto a confirmar com o produto). O mapa **não** aparece nesse estado. Ao buscar, o layout de resultado entra com transição curta.

### D3. Layout sem a coluna lateral
- A busca sobe para o **cabeçalho** (compacta, sempre visível) depois da primeira consulta; antes dela, é a tela de D2.
- O resultado ocupa a largura toda em duas regiões: **detalhes** e **mapa**, lado a lado a partir de ~1024 px (detalhes ~40%, mapa ~60%); empilhados abaixo disso (ver D7).
- O `<aside aria-label="Busca de pedido">` deixa de existir; a busca vira `role="search"` no `<header>`. Landmarks, *skip link* e foco no painel de detalhes ao buscar continuam.

### D4. Resultado que responde a pergunta
- **Cabeçalho do resultado:** número do pedido, status em destaque (badge grande com ícone), e uma frase de resumo por status ("A caminho do destino", "Entrega concluída"). A frase vem de um mapa em `domain/status.ts`, ao lado do `STATUS_CONFIG`.
- **Linha de etapas** (Pendente → Atribuída → Em trânsito → Entregue) no lugar da barra de percentual: `<ol>` com a etapa atual marcada por `aria-current="step"`, etapas anteriores concluídas, seguintes apagadas. O `progressbar` sai; a informação passa a ser textual e estrutural, o que é mais acessível. O percentual deduzido some da tela (era uma aproximação; a ADR 0002 já a marcava como limite).
- **`CANCELADA` e status desconhecido** não mostram a linha de etapas: um aviso com ícone e texto no lugar.
- **Timeline** com linha vertical, ícone por tipo de evento (`TipoEvento`), data relativa ("há 5 min") com a data completa em `<time dateTime>` e `title`. Evento de tipo desconhecido usa ícone neutro e o texto cru.
- **Dados secundários** (distância, tempo estimado, origem, destino) em um bloco compacto abaixo do cabeçalho, com ícones. `—` continua para valor ausente.
- **Atualização em tempo real:** indicador discreto "Atualizado às 14:32" que muda a cada ciclo de polling, com `aria-live="polite"` e sem anunciar a cada 5 s (anunciar só mudança de status).

### D5. Mapa mais legível
- **Marcadores SVG** (pino) para origem e destino com formas diferentes, e o veículo como ponto pulsante (pulso desligado com `prefers-reduced-motion`). O HTML do `divIcon` continua **estático**, sem dado da API (regra D5a da ADR 0002).
- **Rota percorrida** em traço cheio e mais grosso, **restante** tracejada e mais clara; **legenda** pequena sobre o mapa (também presente em texto no `ResumoMapa`).
- **Controles** do Leaflet estilizados pelos tokens (tamanho de toque ≥ 44 px no mobile) e botão "Centralizar" com ícone e nome acessível.
- **Tiles:** manter OSM (a CSP e a política de uso já estão resolvidas). Estilos de tiles de terceiros ficam fora (ver Alternativas).
- O `ResumoMapa` ganha o estilo final e vira um bloco recolhível em telas pequenas.

### D6. Carregando, vazio e erro com desenho
- **Skeleton** do cabeçalho do resultado, das etapas e da timeline enquanto busca (`aria-busy="true"` na região; o `role="status"` com texto continua para leitor de tela).
- **Não encontrado:** ícone, título e orientação ("confira o número ou tente com letras maiúsculas"; texto a confirmar), com o campo de busca em foco.
- **Erro:** ícone, mensagem e "Tentar novamente"; no `429` explica que há muitas consultas e que deve esperar um pouco.
- **Transições** de 150 a 250 ms entre estados e na troca de etapa, todas desligadas sob `prefers-reduced-motion`.

### D7. Mobile de verdade
- Breakpoints em **640 / 1024 px**, além dos 768 atuais.
- Abaixo de 1024 px, **abas "Detalhes | Mapa"** (padrão `tablist` com setas do teclado) no lugar de empilhar tudo. O mapa fica **montado** e é só escondido; ao mostrar a aba, chama-se `map.invalidateSize()` (risco conhecido do Leaflet em contêiner oculto, coberto por teste).
- Campo de busca com `inputMode="text"`, `enterKeyHint="search"`, alvos de toque ≥ 44 px, sem zoom automático no iOS (fonte do campo ≥ 16 px).
- Cabeçalho compacto que não ocupa mais de ~20% da altura em celular.

### D8. Pedido na URL
- O número consultado vai para `?pedido=PED-001` (`URLSearchParams` e `history.replaceState`/`pushState`, **sem biblioteca de rota**). Ao abrir uma URL com `?pedido=`, o portal já busca.
- Botão **"Copiar link"** no resultado, com confirmação por `aria-live`.
- Isso **resolve do lado do React** o limite registrado na ADR 0003 (D5). Alterar o link no painel-admin para usar `?pedido=` é trabalho da ADR 0003, não desta.
- Validação do parâmetro com o mesmo limite do campo (1 a 50 caracteres); valor inválido é ignorado.

### D9. Tema escuro (opcional, ver "Decisões a tomar")
- Tokens redefinidos sob `prefers-color-scheme: dark` e `:root[data-theme="dark"]`, com alternador no cabeçalho e preferência salva em `localStorage` (com `try/catch`, funcionando sem ele).
- **Mapa no escuro:** escurecer só o painel de tiles por filtro CSS; marcadores e rota mantêm cores próprias com contraste conferido nos dois temas.
- Todos os contrastes são conferidos de novo nos dois temas.

### D10. Rede de proteção e critérios de aceite
- **Projeto `rastreamento-e2e`** (Playwright, como o do painel) com a API **mockada** por `page.route`, incluindo `@axe-core/playwright`. Fecha a pendência da ADR 0002.
- **Capturas de tela** (`toHaveScreenshot()`): 5 estados (inicial, carregando, resultado em trânsito, não encontrado, erro) × 3 larguras (390, 768, 1280) × 2 temas, se o D9 for aprovado. Linha de base **antes** de qualquer mudança visual (fase 1).
- **Aceite de cada fase:** `axe` sem violações em todos os estados, contraste conferido com ferramenta, navegação completa só por teclado, `prefers-reduced-motion` respeitado, os testes de comportamento existentes verdes, `grep` de segurança da ADR 0002 sem novos resultados.
- **Desempenho:** hoje o carregamento inicial é ≈ 492 KiB brutos (*medido no build*), com o Leaflet fora do chunk de entrada do mapa. Meta: não passar de +40 KiB brutos com fonte e ícones, e manter o mapa em `lazy`.

## Alternativas consideradas

| Alternativa | Motivo da rejeição / adiamento |
|---|---|
| Biblioteca de UI (MUI, Chakra, Radix Themes) | Peso e estilo próprio para um app de uma tela. **Rejeitado.** Primitivos acessíveis (Radix, `react-aria`) só se surgir diálogo ou menu complexo. |
| Biblioteca de ícones (lucide, react-icons) | Resolve rápido, mas traz dependência para ≈ 10 ícones. Reavaliar se passarmos de ~25. **Adiado.** |
| Tailwind | Reescreve toda a camada de estilos já em CSS Modules e tokens. **Rejeitado.** |
| Tiles de terceiros (Carto, Mapbox, MapTiler) | Exigem mudar a CSP, aceitar termos e, em alguns casos, chave de API. **Rejeitado** por agora; o escurecimento do D9 é feito por CSS. |
| `react-router` para o pedido na URL | Um único parâmetro não justifica a dependência. **Rejeitado** (D8). |
| Animações com biblioteca (Framer Motion) | CSS cobre as transições do D6. **Rejeitado.** |
| Storybook para o rastreamento | O app tem ≈ 8 componentes. As capturas do D10 dão a regressão visual com menos custo. **Adiado.** |
| Redesenho completo (nova paleta e marca) | Sem Figma nem referência de marca; decidir cor por gosto é arriscado. A paleta verde é **refinada**, não trocada. Se houver design, vira ADR nova. |
| Fazer tudo num PR só | Mistura fundação, layout e mapa; a revisão visual fica impossível. **Rejeitado.** |

## Consequências

**Positivas**
- A primeira impressão passa a orientar o usuário (D2) e o resultado responde "onde está minha entrega" em um olhar (D4).
- Aparência igual em qualquer sistema (fonte e ícones empacotados) e identidade mais coesa.
- Funciona bem no celular, onde está boa parte do público de um portal de rastreio (D7).
- Rastreios compartilháveis por link (D8).
- Regressão visual coberta antes de mexer (D10).

**Negativas / riscos**
- Os testes do `App.spec.tsx` citam textos e papéis que vão mudar (por exemplo, o `progressbar` sai com a linha de etapas); será preciso reescrever esses testes, não só ajustá-los.
- Mais CSS e mais SVG no bundle; fonte aumenta o primeiro carregamento (mitigado por subconjunto latino e `swap`).
- Abas no mobile exigem cuidado com o Leaflet em contêiner oculto (`invalidateSize`).
- A linha de etapas assume um fluxo linear; qualquer status novo da API cai no aviso de "status desconhecido" até ser mapeado.
- O tema escuro dobra a superfície de contraste e de captura de tela.
- Os textos de orientação (D2, D6) precisam de aprovação do produto.

**Não muda**
- API, endpoints, rate limit, formato dos dados e schemas Zod.
- A busca por número de pedido e o polling (D4 só muda como o resultado é mostrado).
- CSP, regras de lint de segurança e a regra de popup sem HTML.
- React 18, Nx 19 e a lista de dependências, exceto a fonte e os pacotes de teste de captura.

## Decisões a tomar

| # | Decisão | Proposta |
|---|---|---|
| 1 | Identidade | **Manter o verde, refinado** (sem Figma nem marca definida). |
| 2 | Tema escuro (D9) | **Fazer por último e só se aprovado**; o resto não depende dele. |
| 3 | Ícones | **SVG próprios** (D1); lib só se passar de ~25 ícones. |
| 4 | Pedido na URL (D8) | **Sim**, por `?pedido=`, sem biblioteca de rota. |
| 5 | Textos de orientação (D2, D6) | Produto/negócio aprova antes de entrar. |
| 6 | Mapa no mobile (D7) | **Abas** em vez de empilhar. |

## Plano de implementação

Cada fase é um PR independente, com antes/depois de tela para aprovação.

1. **Rede de proteção:** projeto `rastreamento-e2e`, API mockada, axe, capturas da **linha de base atual** (D10).
2. **Fundação:** tokens ampliados, fonte, ícones SVG, `StatusBadge` com ícone (D1). Nenhuma mudança de layout.
3. **Layout e tela inicial:** cabeçalho com busca, tela de entrada, sem coluna lateral, pedido na URL (D2, D3, D8).
4. **Resultado:** cabeçalho de status, linha de etapas, timeline nova, bloco de dados, indicador de atualização (D4). Reescrever os testes afetados.
5. **Estados:** skeleton, não encontrado, erro, transições (D6).
6. **Mapa:** marcadores SVG, rota e legenda, controles, `ResumoMapa` final (D5).
7. **Mobile:** breakpoints, abas, alvos de toque (D7).
8. **Tema escuro** (D9), **se aprovado**.
9. **Fechamento:** contraste com ferramenta nos dois temas, leitor de tela, desempenho e atualização das capturas (D10).

## Verificação (quando for implementar)
- `npx nx test rastreamento --coverage`, `npx nx lint rastreamento`, `npx nx typecheck rastreamento` e `npx nx build rastreamento` verdes, com o `coverageThreshold` mantido.
- `npx nx e2e rastreamento-e2e`: capturas dentro do limite de diferença e `axe` sem violações sérias ou críticas em todos os estados e larguras.
- `grep -rnE "console\.|innerHTML|dangerouslySetInnerHTML|unpkg|: any|setInterval|prop-types|api/entregas" apps/rastreamento/src` sem novos resultados além das exceções já conhecidas (`logger`).
- Nenhuma requisição a domínio externo além dos tiles do OSM e nenhuma violação de CSP no console; a fonte vem de `self`.
- Navegar por tudo **só com o teclado** e com NVDA: ordem de foco, abas, linha de etapas (`aria-current="step"`), anúncios de carregando, erro e mudança de status.
- Conferir contraste (WebAIM ou DevTools) de todos os pares de cor, nos dois temas se houver tema escuro.
- Abrir `?pedido=PED-001` direto: o portal busca sozinho; recarregar mantém a consulta; valor inválido na URL é ignorado.
- Trocar de aba no mobile com o mapa oculto e confirmar que ele renderiza inteiro (sem tiles cortados).
- Com `prefers-reduced-motion` ligado, nenhuma animação (pulso do veículo, transições, skeleton).
- Comparar o carregamento inicial com o de hoje (≈ 492 KiB brutos): no máximo +40 KiB.
