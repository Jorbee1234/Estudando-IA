# Plano de refatoração visual — `painel-admin`

- **Status:** Superado pelo [ADR 0003](adr/0003-evolucao-visual-painel-admin.md), que foi implementado. Mantido só como histórico: o que ele propunha (tokens, tema escuro, sidebar colapsável, badges com ícone, skeleton, tabelas em cartões, tokens de gráfico) está no ADR, com os resultados e o que ficou de fora.
- **Relação com o ADR:** [ADR 0001](adr/0001-reorganizacao-seguranca-acessibilidade-painel-admin.md) tem prioridade. Este plano **não cria fases novas**: cada item entra dentro de uma fase do ADR, aproveitando o trabalho que ela já faz. Nada aqui é implementado antes de aprovado.
- **Premissa:** o visual atual é simples (cards brancos, sidebar escura, tabelas cruas). A melhoria vem dos **tokens** e dos componentes `shared/ui` da fase 5, e não de um redesenho solto por tela.

## Princípios
1. Tokens primeiro (`src/styles/_tokens.css`); nenhuma cor, raio ou sombra solta nos componentes.
2. Contraste ≥ 4,5:1 e foco visível já nascem nos tokens (fase 6 do ADR só confere).
3. Modo claro como base; **tema escuro** só depois, se aprovado, pois os tokens já o permitem.
4. Sem biblioteca de UI nova (ADR, alternativas). Reavaliar Angular Material só se os `shared/ui` ficarem caros.
5. Cada entrega mostra antes/depois da tela para aprovação.

## Direção visual proposta (a validar)
| Aspecto | Hoje | Proposta |
|---|---|---|
| Paleta | cinzas soltos (`#333`, `#666`, `#999`) | paleta semântica: primária, superfícies, texto, e 4 estados (sucesso, alerta, perigo, info) |
| Tipografia | `px` fixos, 12 px recorrente | escala em `rem`, base 16 px, títulos com peso e espaçamento definidos |
| Cards e tabelas | sombra e raio repetidos 15–19× | 1 elevação, 1 raio, tabela com cabeçalho fixo, linhas em zebra suave e hover |
| Status | badge com texto cru da API | badge com **ícone + rótulo pt-BR**, cor vinda do `STATUS_CONFIG` |
| Dashboard | 4 cards numéricos + lista | cards com ícone e tendência, alertas por severidade, atalhos como links |
| Navegação | sidebar fixa de 250 px | sidebar colapsável, item ativo destacado, menu em gaveta no mobile |
| Formulários | grade simples, erro por `alert()` | `app-form-field` com rótulo, ajuda e erro inline |
| Vazio/erro/carregando | texto solto | `empty-state` com ilustração leve, skeleton no carregamento, banner de erro com "tentar de novo" |
| Responsivo | nenhum `@media` | 3 breakpoints; tabelas viram cartões abaixo de ~640 px |

## Onde cada item entra
| Fase do ADR | Entrega visual |
|---|---|
| 1. Testes | nada visual. Opcional: capturas de tela do Playwright como linha de base "antes". |
| 2. Limpeza | nada visual. |
| 3. Enums/`STATUS_CONFIG` | **rótulo, ícone e cor de cada status** definidos aqui (única fonte). |
| 4. Camada de API | **estados `carregando`/`erro`/`vazio`** ganham o desenho final (skeleton, banner). |
| 5. Estilos | **núcleo do redesenho:** tokens, paleta, tipografia, botões, tabela, badge, card, page-header, empty-state, form-field. Dashboard e Veículos migram primeiro (maiores). |
| 6. Acessibilidade | foco visível, contraste conferido, sidebar colapsável, responsivo, `prefers-reduced-motion`. |
| 7. Segurança | `ToastService` e `ConfirmService` com o visual final (toast e diálogo). |
| 8. Mudança de comportamento | login (tela nova), "Excluir" → "Desativar" com o estilo do botão de perigo. |

## Ordem sugerida dentro da fase 5
1. Tokens + reset + tipografia (afeta todas as telas sem mexer em template).
2. `app-button`, `app-status-badge`, `app-page-header`, `app-empty-state`.
3. `app-data-table` (a maior economia de CSS) e `app-form-field`.
4. Sidebar/shell.
5. Telas, da menor para a maior: Manutenções → Entregas → Motoristas → Dashboard → Veículos.

## Decisões que preciso de você
- **Identidade:** manter a paleta atual (sidebar `#1a1a2e` e azul) refinada, ou definir uma nova?
- **Tema escuro:** entra agora, depois, ou fora?
- **Referência:** há um Figma ou exemplo de painel que você goste? Se houver, uso como base dos tokens.
- **Densidade:** tabelas compactas (mais linhas) ou espaçadas?

## Riscos
- O orçamento `anyComponentStyle` (2 kb/4 kb) tende a ser atendido ao mover o CSS para globais; conferir no build.
- Redesenho junto com refatoração dificulta revisar: manter PRs por componente, com captura antes/depois.
