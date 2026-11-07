# Guia: React no feed do CodeConnect

Este guia explica, com o código real do projeto, os conceitos de React usados na tela de feed. Cada seção diz **o que é**, **onde está no projeto** e **por que foi feito assim**. O código não tem comentários explicativos; o que precisa ser explicado está aqui.

Sumário

1. Componentes e Atomic Design
2. Props
3. Componentes de apresentação e rotas conectadas
4. Estado com `useState`
5. Renderização condicional e listas
6. Formulários e `FormData`
7. Efeitos com `useEffect`
8. Hooks personalizados
9. A URL como estado e o debounce
10. Context
11. Atualização otimista
12. Modal com `<dialog>`
13. Fallback de imagem
14. Rotas aninhadas e layout
15. Testes
16. Acessibilidade
17. Como o filtro funciona no backend
18. Variantes de estilo com CVA
19. Um cliente HTTP único e recursos reutilizáveis
20. O backend em camadas e as mensagens padrão
21. Perfil: upload de arquivo, cor de destaque e validação nos dois lados

---

## 1. Componentes e Atomic Design

Um componente é uma função que recebe dados e devolve JSX (a interface). A tela é construída juntando componentes pequenos.

O projeto organiza em cinco níveis (`apps/web/src/components/`):

| Nível | O que é | Exemplos neste feed |
|---|---|---|
| atoms | peça indivisível | `Tag`, `Tab`, `Avatar`, `Modal`, `Textarea` |
| molecules | atoms combinados | `SearchBox`, `IconCount`, `AuthorBadge`, `PostThumbnail`, `NavItem` |
| organisms | bloco com função própria | `PostCard`, `SidebarMenu`, `FeedFilters`, `CommentSection`, `LoginModal` |
| templates | esqueleto da página | `AppTemplate` |
| pages | tela completa | `FeedPage` |

**Regra:** um componente só usa componentes de nível abaixo do seu. O `PostCard` (organism) usa `Tag` (atom) e `AuthorBadge` (molecule), nunca o contrário. Isso evita dependências circulares e deixa claro onde mexer.

**Reaproveitamento:** `AppTemplate` faz pelo feed o que `AuthTemplate` faz por login e cadastro. O esqueleto é um só; a tela de detalhes do post vai só colocar outro conteúdo dentro dele. O mesmo vale para `PostActions` e `CommentSection`, que a tela de detalhes reaproveita.

## 2. Props

Props são os parâmetros de um componente. Ele não sabe de onde o dado vem; só desenha o que recebe.

```tsx
<Tag variant="selected" onClick={() => onRemoveTag(tag)}>
  {tag}
</Tag>
```

Em `components/atoms/Tag.tsx`, a prop `variant` muda a aparência:

- `card`: etiqueta estática dentro do post;
- `filter`: sugestão clicável;
- `selected`: filtro ativo, com o "×" para remover.

Um componente, três aparências, sem duplicar código. É o mesmo princípio da prop `variant` que adicionamos ao `Button` (`solid` e `outline`) para o botão "Publicar".

**Props de função** (`onClick`, `onLike`, `onSubmit`) são o caminho inverso: o componente filho avisa o pai de que algo aconteceu. O filho não decide o que fazer; o pai decide.

Também existe `children`: o que vai entre as tags. `AppTemplate` recebe `sidebar` e `children`, e por isso serve a qualquer tela.

## 3. Componentes de apresentação e rotas conectadas

Os componentes de `components/` só **desenham** e **avisam**. Quem busca dados e decide o que fazer são os arquivos de `src/routes/`:

- `FeedRoute` conecta `FeedPage` aos filtros, à API e ao login;
- `AppLayout` conecta `SidebarMenu` e os dois modais.

Vantagens:

- testar um `PostCard` é fácil: basta passar um post de exemplo (veja `src/test/fixtures.ts`);
- o mesmo card serve no feed e nos detalhes;
- trocar a API não mexe nos componentes visuais.

É o mesmo padrão já usado em `LoginRoute`/`SignupRoute` no `App.tsx`.

## 4. Estado com `useState`

Estado é a memória de um componente. Quando ele muda, o React redesenha o que depende dele.

```tsx
const [commentsPost, setCommentsPost] = useState<Post | null>(null)
```

Em `FeedRoute`, `commentsPost` guarda o post cujos comentários estão abertos. `setCommentsPost(post)` abre; `setCommentsPost(null)` fecha. O JSX decide pelo valor:

```tsx
{commentsPost && <PostCommentsDialog post={commentsPost} ... />}
```

Dois pontos importantes:

1. **Nunca altere o estado diretamente.** Crie um novo valor: `setPosts((atual) => [...atual, ...novos])`.
2. **Forma funcional** (`(atual) => ...`): use quando o novo valor depende do anterior. Em `useFeed`, `patchPost` usa `current.map(...)` para trocar só um post sem perder os outros.

**O que é estado e o que é derivado.** Se um valor pode ser calculado a partir de outros, não o guarde. Em `useFeed`, `loading` não é um estado: é calculado comparando `loadedKey` com `requestKey`. Menos estado significa menos chance de ficar inconsistente.

## 5. Renderização condicional e listas

Condições entram no JSX com `&&` e o operador ternário:

```tsx
{authenticated ? (
  <NavItem icon="logout" label="Sair" onClick={onLogout} />
) : (
  <NavItem icon="login" label="Entrar" onClick={onLogin} />
)}
```

É assim que a barra lateral mostra "Sair" ou "Entrar" (`organisms/SidebarMenu.tsx`). Não há duas telas, só uma condição.

Listas usam `map` e exigem `key`:

```tsx
{posts.map((post) => (
  <li key={post.id}>
    <PostCard post={post} ... />
  </li>
))}
```

O `key` é a identidade do item. Com ele o React sabe qual item mudou, entrou ou saiu e atualiza só esse. Use o `id` do dado, nunca o índice do array (o índice muda quando a lista muda).

O `FeedPage` também escolhe entre vários estados: carregando, vazio, erro, lista. Cada um é um `{condição && ...}`.

## 6. Formulários e `FormData`

Há duas formas de ler um formulário:

- **Controlado:** cada campo é ligado a um `useState` (`value` + `onChange`);
- **Não controlado:** o navegador guarda os valores e você os lê ao enviar.

`LoginForm`, `CreatePostModal` e `CommentSection` usam a segunda:

```tsx
function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
  const data = new FormData(event.currentTarget)
  const title = String(data.get('title')).trim()
}
```

- `preventDefault()` impede o navegador de recarregar a página;
- `FormData` lê os campos pelo atributo `name`;
- os atributos HTML (`required`, `maxLength`, `type="url"`) já validam sem código extra.

Uma exceção é a caixa de busca (`SearchBox`): ela é **controlada**, porque o texto digitado precisa disparar a busca enquanto a pessoa digita.

## 7. Efeitos com `useEffect`

Um efeito sincroniza o componente com algo **fora** do React: a API, o relógio, o navegador.

```tsx
useEffect(() => {
  const request = { obsolete: false }

  listPosts({ q, tags, sort }).then((page) => {
    if (request.obsolete) return
    setPosts(page.items)
  })

  return () => {
    request.obsolete = true
  }
}, [q, tagsKey, sort, requestKey])
```

Em `hooks/useFeed.ts`:

- **Lista de dependências** (`[q, tagsKey, ...]`): o efeito roda de novo quando algum desses valores muda;
- **Função de limpeza** (o `return`): roda antes do próximo efeito. Aqui ela marca a requisição anterior como obsoleta.

Por que isso importa: digitar "re" e depois "react" dispara duas buscas. Se a primeira responder depois da segunda, a tela mostraria o resultado errado. A marca `obsolete` descarta respostas antigas. Isso evita uma **condição de corrida**.

**Dica:** `useEffect` não é para "calcular valores". Se dá para calcular durante a renderização (como o `loading`), faça isso. O lint do projeto avisa quando se chama `setState` direto dentro de um efeito.

**Chave estável.** `filters.tags` é um array novo a cada renderização; como dependência, o efeito rodaria sempre. Por isso `tagsKey = filters.tags.join('\n')` transforma em texto, que só muda quando o conteúdo muda.

## 8. Hooks personalizados

Um hook é uma função que começa com `use` e reúne estado e efeitos reutilizáveis. Os hooks do feed estão em `src/hooks/`:

| Hook | Responsabilidade |
|---|---|
| `useFeedFilters` | filtros na URL e o texto da busca com debounce |
| `useFeed` | carrega o feed, pagina por cursor, curte e conta comentários |
| `useComments` | carrega e envia comentários de um post |
| `useTags` | carrega as tags sugeridas |

A tela só faz:

```tsx
const feed = useFeed(filters, feedVersion)
```

e recebe `feed.posts`, `feed.loading`, `feed.loadMore`. Toda a complexidade fica escondida. O `useAuth()` que já existia é do mesmo tipo.

**Regras dos hooks:** chame-os sempre no topo do componente, nunca dentro de `if` ou laços, e só em componentes ou outros hooks.

**`useCallback`.** Funções são recriadas a cada renderização. Quando uma função entra na lista de dependências de um efeito, ou é passada a hooks, o `useCallback` mantém a mesma referência enquanto suas dependências não mudam. É o caso de `update` em `useFeedFilters`.

## 9. A URL como estado e o debounce

Os filtros ficam na URL, por exemplo:

```
/?q=formulário&tags=React&tags=CSS&sort=popular
```

`useSearchParams` (do `react-router`) lê e escreve essa parte da URL. Ganhos:

- recarregar a página mantém o filtro;
- dá para compartilhar o link;
- o botão "voltar" funciona.

Regra prática: o que o usuário gostaria de preservar ou compartilhar mora na URL.

**Debounce.** Sem ele, cada letra digitada seria uma requisição. Em `useFeedFilters`:

```tsx
setSearchTextState(value)        // o campo mostra o texto na hora
clearTimeout(timer.current)      // cancela o agendamento anterior
timer.current = setTimeout(() => update(...), 300)  // só grava na URL após 300 ms de pausa
```

Há dois valores diferentes: `searchText` (o que a pessoa vê digitando) e `q` (o que vai para a URL e para a API). O `useRef` guarda o `timer` sem provocar nova renderização.

## 10. Context

Context entrega um valor a toda uma parte da árvore sem passá-lo de prop em prop (o chamado *prop drilling*).

O projeto tem dois:

- `AuthContext` (já existia): `user`, `login`, `logout`;
- `AppLayoutContext` (`src/routes/AppLayoutContext.ts`): `requireAuth`, `feedVersion`, `refreshFeed`.

O uso:

```tsx
const { requireAuth } = useAppLayout()

onLike={(post) => requireAuth(() => feed.toggleLike(post))}
```

`requireAuth(ação)` faz:

- **logado:** executa a ação;
- **visitante:** guarda a ação, abre o modal de login e, depois do login, executa a ação.

Assim o visitante pode clicar em "curtir", entrar e ver a curtida acontecer, sem repetir o clique. O `AppLayout` guarda a ação pendente em um `useRef`, porque ela não precisa causar renderização.

**Por que um hook `useAppLayout`?** Ele encapsula o `useContext` e lança um erro claro se for usado fora do `AppLayout`.

**Onde colocar o provider:** no `AppLayout`, que envolve todas as telas do app. Quem está fora dele (login, cadastro) não enxerga esse contexto.

## 11. Atualização otimista

Em vez de esperar a API para atualizar a tela, atualizamos **primeiro** e desfazemos se falhar. `toggleLike` em `hooks/useFeed.ts`:

1. inverte `likedByMe` e ajusta `likesCount` (+1 ou -1) na hora;
2. chama a API (`PUT` ou `DELETE` em `/posts/{id}/likes/me`);
3. se a chamada falhar, aplica a mesma inversão de novo, voltando ao estado anterior, e mostra o erro.

O usuário sente a interface instantânea. A API é **idempotente** (curtir duas vezes dá o mesmo resultado), o que torna a técnica segura.

Depois do login, o `AppLayout` recarrega o feed (`refreshFeed`) para que os posts já curtidos apareçam marcados, porque a primeira carga foi feita como visitante.

## 12. Modal com `<dialog>`

O `Modal` (`atoms/Modal.tsx`) usa o elemento nativo `<dialog>`. Ele entrega de graça:

- foco preso dentro do modal;
- fechamento com `Esc` (evento `close`);
- fundo inerte e escurecido (`::backdrop`);
- leitores de tela entendendo que há uma janela por cima.

O React não controla o `<dialog>` por uma prop: é preciso chamar `showModal()` e `close()`. Por isso há um `useEffect` que observa `open` e usa uma **ref** (`useRef`) para acessar o elemento DOM:

```tsx
const ref = useRef<HTMLDialogElement>(null)
useEffect(() => { ref.current?.showModal() ... }, [open])
```

Detalhes úteis:

- o conteúdo só é renderizado quando `open` é verdadeiro, então formulários começam vazios a cada abertura;
- clicar no fundo fecha: o clique no `::backdrop` chega ao próprio `<dialog>` (`event.target === event.currentTarget`);
- `aria-labelledby` liga o modal ao título, e `useId()` gera um id único.

## 13. Fallback de imagem

`molecules/PostThumbnail.tsx` mostra a capa quando existe e, caso contrário (ou se a imagem falhar), um gradiente gerado:

```tsx
const [failedSrc, setFailedSrc] = useState<string>()
const showImage = src !== null && src !== failedSrc
```

- `onError` da `<img>` guarda o endereço que falhou;
- o gradiente vem de `placeholderGradient(postId)` (`lib/placeholderGradient.ts`), que transforma o `id` em dois matizes de cor. A mesma entrada sempre dá a mesma saída (função **determinística**), então a cor do post não muda a cada carregamento;
- não faz requisição e funciona offline.

Guardar o endereço que falhou (e não um simples `true`) faz o estado se corrigir sozinho se o post receber outra imagem.

## 14. Rotas aninhadas e layout

Em `App.tsx`:

```tsx
<Route element={<AppLayout />}>
  <Route path="/" element={<FeedRoute />} />
</Route>
```

A rota-pai (`AppLayout`) não tem `path`: ela só fornece o **layout**. O `<Outlet />` é o lugar onde a rota-filha aparece. Quando a tela de detalhes do post existir, ela entra como outra filha e herda sozinha a barra lateral, o modal de login e o `requireAuth`.

O feed deixou de usar `RequireAuth`: a página é pública. A proteção passou a ser **por ação** (curtir, comentar, publicar), não por página.

## 15. Testes

Os testes (Vitest + Testing Library) simulam o usuário e consultam a tela **como ele a vê**:

```tsx
await userEvent.click(screen.getByRole('button', { name: 'Curtir 5' }))
expect(onLike).toHaveBeenCalledWith(samplePost)
```

- `getByRole` com `name` usa o mesmo que leitores de tela usam; se o teste acha o botão, a pessoa também acha;
- `vi.fn()` cria uma função espiã para verificar chamadas;
- `vi.mock` troca um módulo inteiro, como o `postService`, por um falso.

`routes/FeedRoute.test.tsx` é um teste de **integração**: monta layout, rota e modais, troca só a API, e verifica o fluxo "visitante clica em curtir → aparece o login → entra → a curtida acontece".

Cada componente tem seu `.test.tsx` ao lado, como manda o `CLAUDE.md`.

## 16. Acessibilidade

Decisões deste feed, e por quê:

- **Nome acessível do botão de curtir:** `IconCount` usa `aria-label="Curtir 12"`. O número visível fica com `aria-hidden` para não ser lido duas vezes. Um primeiro teste revelou que somar spans produzia "Curtir12".
- **`aria-pressed`** no botão de curtir informa se está ativo.
- **Abas:** `role="tablist"`, `role="tab"` e `aria-selected`.
- **Imagens decorativas** têm `alt=""` ou `aria-hidden`, porque o título e o autor já descrevem o post.
- **Avisos** (`role="status"` e `role="alert"`) anunciam resultados como "Link copiado!" e erros.
- **Foco visível** (`focus-visible:outline-*`) em tudo que é clicável.
- Testes automáticos com `axe` (`src/test/accessibility.test.tsx`) cobrem `FeedPage`, `AppTemplate` e os modais. Eles não substituem uma revisão manual.

## 17. Como o filtro funciona no backend

O front manda tudo em uma só chamada:

```
GET /api/posts?q=formulário&tags=React&tags=CSS&sort=popular&limit=12&cursor=...
```

O cliente `api` (`lib/api.ts`) usa `paramsSerializer: { indexes: null }` em toda requisição para enviar `tags=React&tags=CSS` (repetido), que é o formato que o ASP.NET entende. Sem isso o axios enviaria `tags[]=React`.

No backend (`Infrastructure/Repositories/EfPostQueries.cs`) a consulta é montada em camadas:

1. **`q`**: `ILIKE '%texto%'` em título **ou** descrição (sem diferenciar maiúsculas; `%` e `_` digitados são escapados);
2. **`tags`**: um `Where` por tag, então o post precisa ter **todas** (AND);
3. **`sort`**: `recent` ordena por data e `popular` por curtidas, e em ambos o `Id` desempata;
4. **`cursor`**: a paginação.

**Paginação por cursor (keyset).** A resposta traz `nextCursor`, um texto opaco com a chave de ordenação do último item (data e id, e curtidas em `popular`). A próxima página pede "os itens depois daquele ponto":

```
CreatedAt < ultimo.CreatedAt
OU (CreatedAt = ultimo.CreatedAt E Id < ultimo.Id)
```

Comparada com `page=2`:

- **estável:** posts novos entrando não deslocam a lista nem repetem itens;
- **rápida:** o banco usa o índice e vai direto ao ponto, sem contar e descartar linhas.

O backend busca `limit + 1` itens; se vier um a mais, existe próxima página, e o extra é descartado.

Limite conhecido: em `popular`, se as curtidas mudarem entre uma página e outra, um item pode raramente aparecer repetido ou ser pulado.

**Contadores denormalizados.** `LikesCount` e `CommentsCount` ficam na própria linha do post e são atualizados na mesma transação da curtida ou do comentário. Assim ordenar por popularidade não precisa de `JOIN` e `COUNT`. O custo é manter os contadores sincronizados, o que a transação garante.

---

## 18. Variantes de estilo com CVA

Antes, as variações visuais eram montadas com texto e ternários:

```tsx
className={`... ${active ? 'font-semibold text-accent underline' : 'text-field'}`}
```

Isso cresce mal: o `className` fica ilegível, nada impede um valor inválido e o trecho de foco se repetia em vários arquivos. O **CVA** (`class-variance-authority`) declara as variantes como dados:

```tsx
const tab = cva(`cursor-pointer px-1 text-[22px] ${focusRing}`, {
  variants: {
    active: {
      true: 'font-semibold text-accent underline',
      false: 'text-field hover:text-muted',
    },
  },
})

tab({ active })
```

- o primeiro argumento é a **base**, comum a todas as variantes;
- `variants` lista cada eixo (`variant`, `active`, `layout`...) e as classes de cada valor;
- `defaultVariants` define o valor quando a prop não é passada;
- `VariantProps<typeof button>` gera o tipo das props, então `variant="outlin"` vira erro de compilação;
- `compoundVariants` cobre combinações, como "ativo **e** desabilitado".

**`cn()`** (`lib/cn.ts`) junta `clsx` (aceita condicionais e falsos) com `tailwind-merge` (resolve conflitos). Sem o merge, `size-[1.25em]` e `size-8` ficariam juntos e quem vencia era a ordem do CSS gerado, não a intenção. Com ele, **a última classe vence**:

```tsx
cn('size-[1.25em] shrink-0', className)
```

Por isso `Icon`, `Button`, `Input` e `Textarea` aceitam um `className` de fora que realmente sobrescreve o padrão.

Regra do projeto: variantes novas usam `cva`; `className` externo entra por `cn`.

---

## 19. Um cliente HTTP único e recursos reutilizáveis

`lib/api.ts` expõe os verbos já tipados e é o único lugar que fala com o axios:

```ts
api.get<Post>('/posts/1')
api.post<Post>('/posts', data)
api.put<void>('/posts/1/likes/me')
api.delete<void>('/posts/1/likes/me')
```

Token, tratamento do 401, resposta `204` (vira `undefined`) e o formato de parâmetros repetidos ficam centralizados.

Para recursos REST, `createResource` gera as operações comuns:

```ts
const posts = createResource<Post, NewPost, Page<Post>>('/posts')
posts.list({ q })          // GET  /posts?q=
posts.get(id)              // GET  /posts/:id
posts.create(data)         // POST /posts
posts.nested(id, 'comments').list()  // GET /posts/:id/comments
```

Os services (`postService`, `authService`) só **compõem** essas peças e continuam exportando as mesmas funções (`listPosts`, `login`...), então hooks e componentes não mudaram. Preferimos composição a uma classe base: é mais simples de testar (basta espionar `http.request`) e de combinar.

---

## 20. O backend em camadas e as mensagens padrão

O `Controller` deixou de conter regra de negócio. O fluxo de `POST /api/posts/{id}/comments`:

```
CommentsController  ->  CommentService  ->  ICommentRepository (porta)
   (HTTP)               (caso de uso)         EfCommentRepository (EF Core)
```

- **Domain**: as entidades e regras puras;
- **Application**: casos de uso e as **portas** (interfaces) de que precisam. Não conhece EF nem HTTP;
- **Infrastructure**: implementa as portas (banco, JWT). É aqui que mora o SQL e o tratamento do erro `23505` do Postgres;
- **Controllers**: convertem a requisição em chamada de serviço e o resultado em resposta.

Um caso de uso devolve `Result<T>`: sucesso com valor ou um `AppError` (`NotFound`, `Validation`, `Conflict`, `Unauthorized`). A `ApiControllerBase` transforma o erro em `ProblemDetails` com o status certo, então o controller fica assim:

```csharp
var result = await comments.AddAsync(CurrentUserId, postId, request.Body, ct);
return ToActionResult(result, c => Created($"...", c.ToResponse(postId)));
```

**Mensagens padrão.** Todo erro tem `title` (mensagem do status), `detail` (mensagem do cenário) e um `code` estável que o front pode usar:

```json
{ "title": "Recurso não encontrado.", "status": 404,
  "detail": "Publicação não encontrada.", "code": "post.not_found" }
```

Os textos ficam em `Application/Common/Messages.cs`. Os testes de `apps/api.Tests` conferem status, `title`, `detail` e `code` de cada cenário (login inválido, e-mail repetido, post inexistente, cursor inválido, sem token, 403 e 500 sem vazar detalhes).

---

## 21. Perfil: upload de arquivo, cor de destaque e validação nos dois lados

A tela `/perfil/:userId` mostra os dados de um usuário e os posts dele. O dono pode editar o "sobre", a foto, o banner e a cor de destaque. A rota é pública, como o feed; o que muda para o dono é só a presença dos controles.

**Rota por id.** A URL usa o `id` do usuário, que nunca muda (o `@username` pode mudar, veja abaixo). Em `AuthorBadge`, o `@handle` do card vira um `<Link to={`/perfil/${userId}`}>`. Por isso, `PostCard` agora precisa de um roteador nos testes.

**Quem é o dono.** `ProfileRoute` compara `user.id === userId` (vindo de `useAuth` e de `useParams`). Os modais só são renderizados para o dono, e o `ProfileHeader`/`ProfileBanner` só mostram os botões de edição com `isOwner`. No backend não há como editar o perfil alheio: as rotas de escrita são `/api/profiles/me/...`, e o dono vem do token.

**Upload de arquivo.** Um arquivo não vai em JSON: usa-se `FormData` e `multipart/form-data` (`services/profileService.ts`):

```ts
const form = new FormData()
form.append('file', file)
api.put<void>(`/profiles/me/${kind}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
```

O cliente HTTP define `application/json` como padrão; sobrescrever o cabeçalho deixa o axios completar o `boundary` do multipart. No ASP.NET, o parâmetro `IFormFile? file` recebe a parte chamada `file`.

**Pré-visualização.** `ImageUploadField` usa `URL.createObjectURL(file)` para mostrar a imagem escolhida sem enviá-la. Essa URL ocupa memória até ser liberada, então o componente chama `URL.revokeObjectURL` ao trocar de arquivo e ao desmontar. A criação acontece no **evento** (`onChange`), não em um `useEffect`, porque o efeito só precisaria chamar `setState` para espelhar algo que o evento já sabe.

**Cor de destaque com uma variável CSS.** Em vez de repassar a cor por props até cada botão, o wrapper da página sobrescreve `--color-accent`:

```tsx
const accent = profile.accentColor ? ({ '--color-accent': profile.accentColor } as CSSProperties) : undefined
<div style={accent}>...</div>
```

As classes `text-accent`, `border-accent` e `bg-accent` do Tailwind leem essa variável, então tudo dentro do wrapper muda de cor sem nenhum componente saber disso. Os modais ficam **fora** do wrapper (são `<dialog>` no topo do documento) e mantêm o verde padrão.

**Validar nos dois lados.** O backend é a fonte da verdade (`ProfileService`): um cliente pode burlar o navegador. O frontend repete as regras (`lib/profileValidation.ts`) só para dar resposta imediata e evitar um envio que será recusado:

| Regra | Backend | Frontend |
|---|---|---|
| Tipo de imagem | bytes iniciais do arquivo (`ImageSignature`) | `file.type` e `accept` |
| Tamanho | 2 MB (foto) e 4 MB (banner) | `file.size` antes de enviar |
| Cor | `#RRGGBB` e contraste ≥ 3:1 com o fundo | `hasEnoughContrast` bloqueia o botão |
| "Sobre" | até 500 caracteres | `maxLength` e contador |

O backend não confia no `Content-Type` declarado: um arquivo de texto pode se dizer `image/png`. Ele confere os primeiros bytes (`89 50 4E 47...` para PNG, `FF D8 FF` para JPEG, `RIFF....WEBP` para WebP). O contraste usa a fórmula de luminância relativa do WCAG; a mesma função existe em C# (`AccentColor`) e em TypeScript, e os dois conjuntos de testes usam as mesmas cores para garantir que concordam.

**Imagem no banco e cache.** As imagens ficam em colunas `bytea` de `user_profiles`. Duas medidas evitam custo:

- o `GET /api/profiles/{id}` não carrega os bytes; devolve só `avatarUrl`/`bannerUrl` (ou `null`);
- `GET /api/profiles/{id}/avatar` envia um `ETag` baseado em `UpdatedAt`. O navegador pergunta com `If-None-Match` e recebe **304** sem corpo se nada mudou. A URL também leva `?v=<UpdatedAt>`, então ao trocar a foto a URL muda e o navegador não mostra a antiga.

**PATCH parcial.** `PATCH /api/profiles/me` altera só o que for enviado (nome, `@username`, "sobre", cor). A regra é simples e não precisa de um tipo "opcional": campo **omitido ou `null` = não muda**; **string vazia = limpa** (só "sobre" e cor; nome e username não podem ficar vazios). Por isso `ProfileRoute` não reenvia mais a cor ao salvar só o "sobre", nem o "sobre" ao salvar só a aparência: cada tela manda apenas o seu campo. A versão anterior era um `PUT` que trocava tudo e exigia esse remendo.

**Reaproveitamento.** A lista de projetos é o mesmo `useFeed`, agora com um terceiro parâmetro `authorId`, que vira `?authorId=` em `GET /api/posts`. `useShare` (copiar link) e `useAsyncAction` (estado de `pending` e `error` de uma ação assíncrona) saíram de `FeedRoute` para serem usados também por `ProfileRoute`.

### Foto do autor nos cards

`AuthorResponse` ganhou `avatarUrl`. O ponto de atenção é o custo: a foto fica numa coluna `bytea`, e um feed lista dezenas de autores. As consultas (`EfPostQueries`, `EfCommentRepository`) usam uma **subconsulta correlacionada** que só olha se `AvatarData` não é nulo e devolve o `UpdatedAt`; os bytes nunca saem do banco. A URL (`/api/profiles/{id}/avatar?v=<versão>`) é a mesma do perfil, então o navegador reaproveita o cache entre a página do perfil e os cards. No front, `Avatar` já tinha o fallback: sem `src` (ou com imagem quebrada) mostra a inicial colorida.

### @username: campo próprio, único e com limite de troca

Antes, o `@handle` era calculado a partir do primeiro nome, então dois "Ana" tinham o mesmo `@ana`. Agora é uma coluna `users.Username`, com **índice único**. Ela fica em `users` (e não em `user_profiles`) porque é identidade: é lida em todo post e comentário, que já fazem join com `users`, e `user_profiles` é opcional.

- **Valor inicial.** No cadastro, `Username.FromName` pega a primeira palavra do nome sem acentos (`Ângela` → `angela`). Se já existir, `UserService` tenta `angela_2` até `angela_5` e, depois disso, um número aleatório (`angela_48213`). Quem decide é o banco: `TryAddAsync` devolve `AddUserResult` (`Added`, `EmailTaken` ou `UsernameTaken`), distinguindo os dois índices únicos pelo nome da constraint do Postgres. Um simples `bool` não bastaria, porque "e-mail repetido" e "username repetido" pedem reações diferentes e, entre uma checagem e a gravação, outra requisição pode ocupar o nome (por isso não se faz "verifica e depois grava").
- **Migration com dados existentes.** Adicionar uma coluna obrigatória única em uma tabela que já tem linhas falha. A migration `AddUsernames` faz em três passos: cria a coluna aceitando nulo, **preenche** por SQL (primeiro nome sem acento, sufixo `_2`, `_3` nos repetidos via `row_number()`) e só então torna obrigatória e cria o índice. Há um teste que migra um banco até a versão anterior, insere usuários com nomes complicados e aplica a migration.
- **Regra de 30 dias sem corrida.** Ler a data, comparar e gravar em passos separados deixaria duas requisições simultâneas passarem. A condição vai dentro do `UPDATE` (`WHERE UsernameChangedAt IS NULL OR UsernameChangedAt <= agora - 30 dias`) e o número de linhas afetadas diz se valeu. Zero linhas = ainda no prazo. O teste dispara 5 trocas ao mesmo tempo e exige exatamente 1 sucesso.
- **Idempotência.** Mandar o username que o usuário já tem devolve 200 sem reiniciar o prazo. Um pedido inválido ou recusado (nome em uso) também não consome o prazo, porque a data só é gravada quando a troca acontece. A primeira troca é livre (`UsernameChangedAt` nulo).
- **Erros.** `400` `profile.invalid_username` (formato, tamanho 3 a 30, palavras reservadas), `409` `profile.username_taken` e `409` `profile.username_change_too_soon` (a mensagem traz a data liberada).
- **Lição de teste: nomes comuns.** A primeira versão tentava `maria`, `maria_2`... até `maria_100` e desistia. A suíte, que cria centenas de "Maria Silva", derrubou o cadastro com 500; em produção aconteceria com qualquer primeiro nome popular. Agora só os 5 primeiros candidatos são sequenciais e os seguintes usam um número aleatório. Moral: limite fixo de tentativas em um gerador de nomes é um bug esperando volume.

### Editar perfil em um modal: `PATCH` atômico e formulário que manda só o que mudou

Em vez de um campo de edição para cada coisa, o botão **Editar perfil** abre `EditProfileModal` com **nome**, **@username** e **sobre**. O nome pode mudar quando o usuário quiser (2 a 100 caracteres, como no cadastro); o `@username`, a cada 30 dias.

- **Tudo ou nada.** Três requisições separadas deixariam estado pela metade (nome salvo, username recusado). O `PATCH` roda numa **transação** (`EfProfileRepository.UpdateAsync`): se o username é recusado, o nome e o "sobre" também não são gravados. Um teste prova isso (nome + sobre + username em uso → 409 e nada mudou).
- **Todos os erros de uma vez.** O serviço valida todos os campos antes de gravar e devolve `errors` com cada campo inválido (o `code` é o do primeiro). Assim o modal mostra cada mensagem no campo certo, em vez de o usuário descobrir um erro por tentativa. O front lê isso com `getApiFieldErrors` (chaves em minúsculas) e `useAsyncAction().fieldErrors`.
- **Mandar só o que mudou.** O formulário compara cada campo com o perfil atual (após `trim`/normalização) e monta o corpo só com as diferenças; "Salvar" fica desabilitado se não há mudança ou há erro de validação. Isso evita reiniciar o prazo do username sem querer e deixa o `PATCH` pequeno.
- **Erro do servidor não fica "velho".** A mensagem de um campo só aparece enquanto o valor digitado for o mesmo que foi enviado; ao editar de novo ela some. Sem isso, "este @username já está em uso" continuaria na tela depois de o usuário trocar o nome.
- **Username bloqueado.** Se `usernameChangeAvailableAt` está no futuro, o campo fica desabilitado com a data ligada por `aria-describedby`, e nome e "sobre" seguem editáveis. O front nunca envia o username nesse caso.
- **Trocar o nome não mexe em credenciais nem no token.** O login é por e-mail + senha (o hash não usa o nome) e o token identifica o usuário pela claim `sub`. O JWT chegou a levar uma claim `name`, que ficaria velha após a troca; como nada a lia, ela foi removida para ninguém passar a depender de um dado que envelhece.
- **Estado do modal.** `Modal` só renderiza o conteúdo quando aberto, e o formulário fica num componente interno, então os campos voltam aos valores salvos a cada abertura (cancelar descarta o rascunho).

---

## Para praticar

1. Siga o caminho do clique em "Limpar tudo": de `FeedFilters`, passando por `useFeedFilters.clear`, até a nova requisição em `useFeed`.
2. Em `FeedRoute.test.tsx`, escreva um teste em que o login falha e o modal mostra o erro.
3. Crie a rota `/posts/:id` reutilizando `AppLayout`, `PostActions` e `CommentSection`.
4. Troque, no `useFeed`, a "chave de requisição" por `AbortController` e compare as duas abordagens.
5. Em `EditProfileModal.test.tsx`, escreva um teste em que o servidor recusa o nome e o erro aparece no campo "Nome" (e some ao digitar).
6. Coloque também a cor de destaque no modal "Editar perfil" e remova o modal "Banner e cor" da cor. O que muda no `PATCH` e na validação de contraste?
7. Faça o `@username` do comentário (`CommentItem`) levar ao perfil, como no `PostCard`. O que muda para o diálogo de comentários, que está aberto por cima da página?
