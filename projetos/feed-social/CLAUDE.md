# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

pnpm monorepo with two apps:

- `apps/web`: React 19 + TypeScript + Vite frontend
- `apps/api`: ASP.NET Core (.NET 9) controller-based API. Its `package.json` only wraps `dotnet` commands so that pnpm can run it alongside the frontend; it has no JS dependencies.

## Commands

Run from the repository root:

```sh
pnpm install          # install JS dependencies
pnpm dev              # run web and api together, both with hot reload
pnpm dev:web          # Vite dev server only
pnpm dev:api          # dotnet watch on the "http" launch profile only
pnpm build            # build everything (web: tsc -b && vite build; api: dotnet build -c Release)
pnpm build:web        # or build:api, to build one app
pnpm lint             # oxlint, web only; there is no linter configured for the API
pnpm test             # Vitest, web only
pnpm test:api         # xUnit integration tests of the API (apps/api.Tests); needs Docker running
pnpm web test src/components/atoms/Button.test.tsx   # run a single test file
pnpm preview          # serve the built frontend
pnpm start:api        # run the API without watch
pnpm db:up            # start PostgreSQL (docker compose); required before the API
pnpm db:down          # stop it; data survives in the pgdata volume (docker compose down -v wipes it)
pnpm db:logs          # follow the database logs
```

`pnpm web <script>` and `pnpm api <script>` run any script in that app (for example `pnpm api restore` or `pnpm api clean`).

`pnpm dev:web` does not type-check; type errors only surface through `tsc -b` in the web build.

## Architecture

The frontend reaches the API through same-origin `/api` paths:

1. Frontend code calls the typed verbs of `api` in `apps/web/src/lib/api.ts` (`api.get<T>(path)`, `api.post<T>(path, data)`, `api.put`, `api.patch`, `api.delete`), built on an axios instance (`http`, `baseURL: /api`), passing a path without the prefix (`api.get('/health')`). They throw `AxiosError` on non-2xx responses, return `undefined` on 204 and serialize repeated query parameters without indexes (`tags=a&tags=b`). A request interceptor adds `Authorization: Bearer <token>`; a 401 (except from `/tokens`) clears the token. `getApiErrorMessage()` turns ProblemDetails into a user-facing message. Endpoint calls live in `apps/web/src/services` (`authService`, `postService`), which build on `createResource<T, TNew, TList>(path)` (`lib/createResource.ts`: `list`, `get`, `create`, `remove` and `nested(id, segment)` for sub-resources); reuse it instead of calling `http` directly. Services are composed from these helpers, not from classes.
2. In development, the Vite proxy in `apps/web/vite.config.ts` forwards `/api` to `http://localhost:5164`.
3. Controllers in `apps/api/Controllers` handle the request. They inherit `ApiControllerBase` and declare their own `[Route("api/[controller]")]` (never on the base class: `[Route]` is inherited and would add a second route), so `HealthController` serves `/api/health`.

### API layers

`apps/api` is a single project organized in layers by folder and namespace. Dependencies only point inward:

- `Domain/` (`Api.Domain`): entities (`User`, `UserProfile`, `Post`, `Tag`, `Comment`, `PostTag`, `PostLike`) and their rules (`Tag.Normalize`, `User.NormalizeEmail`, `UserProfile.NormalizeAbout`, `AccentColor`, `Username`). Depends on nothing.
- `Application/` (`Api.Application`): use cases (`PostService`, `CommentService`, `TagService`, `UserService`, `AuthService`, `ProfileService`), the ports they need in `Abstractions/` (`IPostRepository`, `IPostQueries`, `ICommentRepository`, `ITagRepository`, `IUserStore`, `IProfileRepository`, `ITokenService`), read models in `Models/` (`PostView`...), `FeedCursor`, `Result<T>`/`Result` with `AppError`, and the message catalog `Common/Messages.cs`. It must not reference EF Core, Npgsql, `IActionResult` or `ModelState`. Services return `Result`; they never throw for expected failures.
- `Infrastructure/` (`Api.Infrastructure`): implements the ports. `Persistence/` (`AppDbContext`, `Migrations`, `DevDataSeeder`, `DatabaseInitializer`), `Repositories/` (`Ef*`; the Postgres `23505` handling, the `ON CONFLICT` like insert and the like/comment counters live here), `Security/` (`JwtTokenService`, `JwtOptions`) and `AddInfrastructure()`.
- Web layer (`Controllers/`, `Dtos/`, `Mapping/`, `Http/`): controllers only bind input, call one service and turn the `Result` into an HTTP response through `ApiControllerBase`. `Mapping/ResponseMapper` converts read models into DTOs and builds the HATEOAS links. `Http/` holds the pipeline setup (`AddStandardProblemDetails`, `AddJwtAuthentication`, `AddSwaggerDocs`) and `ClaimsPrincipalExtensions`. `Program.cs` is the composition root: `AddInfrastructure()`, `AddApplication()`, then the web setup.

`ApiControllerBase` centralizes `Fail(AppError)` (maps `ErrorKind` to 400/401/404/409 as `ProblemDetails`), `ToActionResult(result, onSuccess)`, `CurrentUserId` and the cache helpers (`MarkPrivateCache`, `MarkNoStore`). New endpoints follow the same shape: DTO in, service call, `ToActionResult`.

### Error messages

Every error response is `application/problem+json` with `title` (default message of the status), `detail` (message of the scenario), a stable `code` extension and, for validation, `errors` per field. All texts and codes live in `Application/Common/Messages.cs` (`Messages.Titles`, `Messages.Codes`, scenario constants) and the predefined errors in `Errors`; add a new scenario there (and to `Messages.Codes.All`) instead of writing a string in a controller. Framework-generated errors (401 challenge, 403, 404, 500, malformed body) get the same format from `AddStandardProblemDetails`; a 500 never exposes the exception.

Because of the proxy, the API has no CORS configuration. Nothing in the repo yet defines how `/api` is routed in production: the proxy applies only to the Vite dev server, and the API does not serve the frontend's static files.

The database port (5432) is defined in `docker-compose.yml` (`POSTGRES_PORT`) and in `ConnectionStrings:Default`; keep them in sync.

The API port (5164) is hardcoded in three places that must stay in sync: `apps/api/Properties/launchSettings.json`, `apps/web/vite.config.ts`, and `apps/api/Api.http`.

In the Development environment the API exposes Swagger UI at `/swagger` (Swashbuckle; document at `/swagger/v1/swagger.json`); outside Development it enables HTTPS redirection instead. The Swagger UI has an **Authorize** button: paste the `accessToken` returned by `POST /api/tokens`.

### Authentication

- `POST /api/users` registers a user, `POST /api/tokens` logs in and returns a JWT, and `GET /api/users/me` (`[Authorize]`) returns the logged-in user.
- Users are persisted in PostgreSQL through EF Core (`Npgsql.EntityFrameworkCore.PostgreSQL`): `AppDbContext` in `apps/api/Infrastructure/Persistence`, `EfUserStore` (scoped) behind `IUserStore`. E-mail uniqueness is enforced by a unique index on `User.NormalizedEmail` (the store maps the Postgres `23505` error to a 409). Passwords are hashed with `PasswordHasher<User>`.
- The database runs from `docker-compose.yml` at the repository root (`postgres:17-alpine`, named volume `pgdata`). Defaults can be overridden through a root `.env` (see `.env.example`). The connection string is `ConnectionStrings:Default`, set in `appsettings.Development.json` to match the compose defaults; in production provide `ConnectionStrings__Default`, otherwise the API fails on startup.
- Migrations live in `apps/api/Infrastructure/Persistence/Migrations` and are applied automatically on startup in Development only (`DatabaseInitializer`). `dotnet-ef` is a local tool (`.config/dotnet-tools.json`; run `dotnet tool restore` once). After changing the model, run `dotnet ef migrations add <Name>` from `apps/api`.
- JWT settings are in the `Jwt` section of `appsettings.json`. `Jwt:SecretKey` (at least 32 characters) is set only in `appsettings.Development.json`; in production provide it through the `Jwt__SecretKey` environment variable, otherwise the API fails on startup.
- Inbound claim mapping is off (`MapInboundClaims = false`), so read the user id from the `sub` claim, not `ClaimTypes.NameIdentifier`. `ClaimsPrincipalExtensions.GetUserId()` (`Http/`) does this and returns null for anonymous callers; controllers read it through `CurrentUserId`.

### Posts feed

- Models in `apps/api/Models`: `Post`, `Tag`, `PostTag` (many-to-many), `PostLike` (composite key = one like per user) and `Comment`. `Post.LikesCount`/`CommentsCount` are denormalized counters, updated in the same transaction as the like/comment.
- Endpoints: `GET /api/posts` (public), `GET /api/posts/{id}` (public), `POST /api/posts`, `PUT|DELETE /api/posts/{id}/likes/me` (idempotent, 204), `GET|POST /api/posts/{postId}/comments` and `GET /api/tags`. Reads are public; every write is `[Authorize]`. Reads still read the optional token so `likedByMe` and the hypermedia links fit the caller.
- Filtering and paging live in `Infrastructure/Repositories/EfPostQueries` (`IPostQueries`): `q` (ILIKE on title and description), repeated `tags` (a post must have all of them), `sort=recent|popular` and keyset pagination through the opaque `cursor` (`Application/Common/FeedCursor`; the response carries `nextCursor`). A cursor is only valid for the sort it was issued for.
- `Infrastructure/Persistence/DevDataSeeder` seeds users (`julio@example.com`, `ana@example.com`, `marcos@example.com`, password `Senha@1234`), tags and 24 posts with likes and comments, in Development only and only when there are no posts. About half of the seeded posts have no `ThumbnailUrl`.
- `GET /api/posts?authorId=` filters the feed by author (kept in the `next` link); the profile's project list uses it.

### Profiles

- Table `user_profiles` (1:1 with `users`, created on demand; no row = empty profile): `About` (≤ 500), `AccentColor` (`#RRGGBB`, null = default green), `AvatarData`/`BannerData` as `bytea` with their content types, and `UpdatedAt` (used for the `?v=` cache-buster in `avatarUrl`/`bannerUrl` and for the `ETag`). The profile is keyed by user id, not by username.
- The `@handle` is the unique `users.Username` (lower-case, 3 to 30 of `a-z0-9_`, not a reserved word; unique index). JSON still calls it `handle`. It is generated at registration from the first word of the name without accents (`Username.FromName`: `ana`, `ana_2`...`ana_5`, then a random number such as `ana_48213` so common names never run out; `UserService.RegisterAsync` retries on the unique index, and `IUserStore.TryAddAsync` tells `EmailTaken` from `UsernameTaken` by the constraint name). The username can be changed through `PATCH /api/profiles/me`: the first change is free, then once every 30 days (`Username.ChangeInterval`); the same username is a no-op that does not restart the interval; errors are `profile.invalid_username` (400), `profile.username_taken` and `profile.username_change_too_soon` (409). The interval check and the write are one conditional `UPDATE` inside `EfProfileRepository.UpdateAsync`, so concurrent calls cannot bypass it. `ProfileResponse.usernameChangeAvailableAt` is null when a change is allowed. Tests that need an old `UsernameChangedAt` set it through `ApiFactory.ExecuteAsync`; never assume a handle literal in tests, since equal first names get a suffix.
- `PATCH /api/profiles/me` updates `name`, `username`, `about` and `accentColor` together or not at all (one transaction in `EfProfileRepository.UpdateAsync`; a refused username leaves the name and the about untouched). A field that is omitted or `null` is kept; an empty string clears `about` and `accentColor` (it is invalid for `name` and `username`); `{}` is a 200 no-op. All fields are validated at once: the 400 `errors` lists every offending field and `code` is the first one's (name, username, about, accentColor). The name has 2 to 100 characters (same as sign-up, `User.IsValidName`), can be changed whenever the user wants, and is independent of the username. Renaming affects neither credentials (login is e-mail + password) nor tokens (identified by `sub`; the JWT no longer carries a `name` claim, so nothing can go stale).
- `AuthorResponse` (posts and comments) carries `avatarUrl` (same `?v=` URL as the profile, null without a picture): `EfPostQueries`/`EfCommentRepository` read only the profile's `UpdatedAt` in a correlated subquery, never the image bytes.
- `ProfilesController` (`api/profiles`) and `ProfileService`/`IProfileRepository`: `GET /{userId}` (public), `PATCH /me` (below), `PUT|DELETE /me/{avatar|banner}` (multipart `file` part; 204; DELETE idempotent) and `GET /{userId}/{avatar|banner}` (public, `ETag`, 304). Writes use `/me`, so a user can only change their own profile.
- Validation lives in `ProfileService`/`Domain`: PNG/JPEG/WebP checked by magic bytes (`ImageSignature`, not the declared content type), avatar ≤ 2 MB, banner ≤ 4 MB, color must be `#RRGGBB` and keep a contrast ratio ≥ 3:1 against the page background (`AccentColor.HasEnoughContrast`). `apps/web/src/lib/profileValidation.ts` mirrors these rules for instant feedback; keep both in sync.

## Frontend conventions

- **Atomic Design:** organize components by level under `apps/web/src/components/`: `atoms`, `molecules`, `organisms`, `templates`, `pages`. A component may only be composed from levels below its own.
- **Tailwind CSS:** style with Tailwind utility classes rather than new component CSS files. Design tokens (colors, font) live in the `@theme` block in `apps/web/src/index.css`.
- **Variants with CVA:** declare variant and state classes with `cva` (`class-variance-authority`) and type the props with `VariantProps`; do not build class names with template strings or ternaries. Merge an external `className` with `cn()` (`lib/cn.ts`: `clsx` + `tailwind-merge`, so the caller's classes win over conflicting ones), and reuse `focusRing` from the same file for the shared focus outline. Examples: `Button`, `Tag`, `NavItem`. Fields share `atoms/fieldStyles.ts`.
- **Tests:** every component must have a test, next to it as `<Component>.test.tsx`, covering its essential usage. Tests use Vitest and Testing Library, and import from `vitest` explicitly because globals are off.
- **Auth screens:** `AuthTemplate` holds the layout shared by `LoginPage` and `SignupPage`; it receives the banner, texts, and form content as props.
- **Auth state:** `AuthProvider` (`src/auth`, wrapped in `main.tsx`) exposes `useAuth()` (`user`, `login`, `signup`, `logout`). The JWT is stored by `lib/authStorage.ts`: localStorage when "Lembrar-me" is checked, otherwise sessionStorage. `LoginRoute`/`SignupRoute` in `App.tsx` connect the presentational pages to `useAuth`. The login field is an e-mail, since the API only accepts e-mail. `RequireAuth` is available for pages that need a login, but the feed does not use it.
- **Routing:** `react-router` (`BrowserRouter` in `main.tsx`, routes in `App.tsx`: `/` feed, `/perfil/:userId` profile (public), `/login`, `/cadastro`; unknown paths go to `/`). Internal links use `TextLink`, which wraps the router's `Link`, so components that render it need a router in tests (`MemoryRouter`).
- **App screens:** `AppTemplate` (sidebar + content) is the shell for every screen after the auth pages, such as the feed and the future post details. It is used by the `AppLayout` route (`src/routes`), which connects `SidebarMenu`, the login dialog and the new-post dialog; screens render inside its `<Outlet />`. The feed is public: visitors read it, and any interaction goes through `useAppLayout().requireAuth(action)`, which opens the login dialog over the page and runs the action after the login. `PostActions` and `CommentSection` are shared with the post details.
- **Feed data:** `services/postService.ts` calls the API; `hooks/useFeedFilters` keeps `q`, `tags` and `sort` in the URL, `hooks/useFeed` loads and pages the feed (optimistic like with rollback) and `hooks/useComments` loads and posts comments. Posts without a cover (or with a broken one) show a gradient generated from the post id (`lib/placeholderGradient`, used by `PostThumbnail`).
- **Profile:** `ProfileRoute` (container) wires `useProfile`, `useFeed(filters, refreshKey, authorId)`, `useShare` and `useAsyncAction` to the presentational `ProfilePage` (`ProfileBanner`, `ProfileHeader`) and to the `AvatarUploadModal`/`ProfileAppearanceModal` dialogs, which only render for the owner (`user.id === userId`). `services/profileService.ts` calls the API (`uploadImage` sends `FormData`). The user's accent color is applied by overriding the `--color-accent` CSS variable on the page wrapper, so every `*-accent` utility inside follows it; dialogs live outside the wrapper and keep the default green. A post author's `@handle` (`AuthorBadge` with `userId`) links to `/perfil/:id`, so `PostCard` needs a router in tests, and shows `author.avatarUrl` through `Avatar src` (initial as fallback; `CommentItem` does the same without the link). The owner edits name, `@username` and about in one `EditProfileModal` opened by the "Editar perfil" button of `ProfileHeader` (the header has no inline editing). The form validates with `lib/profileValidation.ts` (`validateName`, `validateUsername`; mirrors the backend), sends only the fields that changed (`updateProfile` is a `PATCH`; `""` clears the about), shows each API error next to its field (`getApiFieldErrors` through `useAsyncAction().fieldErrors`) and disables the username field with the unlock date while `usernameChangeAvailableAt` is in the future. A server error is shown only while the value that caused it is unchanged. `ProfileRoute` replaces the profile and refreshes the posts list after a save so the cards show the new name and handle. Banner and color live in a separate "Banner e cor" dialog (`ProfileAppearanceModal`) that sends only `accentColor`.
- **No explanatory comments:** concepts are explained in `docs/guia-react-feed.md`, not in the code.
- `apps/web/tsconfig.app.json` sets `erasableSyntaxOnly` and `verbatimModuleSyntax`: no `enum`, `namespace`, or constructor parameter properties, and type-only imports must use `import type`. It also sets `noUnusedLocals` and `noUnusedParameters`, so unused code fails the build.

## Backend conventions

The API must adhere to all REST constraints:

- **Resources:** URIs identify resources with plural nouns, never verbs (`/api/users/42`, not `/api/getUser`). Because routes use `[controller]`, name controllers in the plural (`UsersController`). Express relationships through nesting (`/api/users/42/orders`).
- **HTTP methods:** use `GET` (safe), `POST` (create), `PUT` (full replace, idempotent), `PATCH` (partial update), and `DELETE` (idempotent) according to their semantics. `GET` must never change state.
- **Status codes:** return the code that matches the outcome: `200`; `201` with a `Location` header (`CreatedAtAction`); `204`; `400`; `401`; `403`; `404`; `409`; `422`. Never return `200` with an error in the body.
- **Errors:** return error bodies as `ProblemDetails` (`application/problem+json`).
- **Stateless:** each request carries everything needed to process it; keep no client session state on the server.
- **Cacheable:** mark responses as cacheable or not (`Cache-Control`, `ETag` where useful).
- **Uniform interface:** resources are represented by DTOs rather than persistence entities, and responses include hypermedia links to related resources and available actions (HATEOAS).
- **Layered system:** clients depend only on the HTTP contract, never on what sits behind it. Inside the API, keep the layers described in "API layers": no business rule or `AppDbContext` in controllers.
- **Tests:** every endpoint and error scenario has an integration test in `apps/api.Tests` (xUnit, `WebApplicationFactory` and a throwaway PostgreSQL container from Testcontainers). Assert status, `application/problem+json`, `title`, `detail` and `code` using the constants from `Messages`, not literals.

## Git

All commits, in both apps, follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **Scopes:** `web` or `api`; omit the scope for changes that span both apps or only touch the repository root.
- **Breaking changes:** add `!` after the type or scope, and a `BREAKING CHANGE:` footer describing the change.

App-specific ignore rules belong in `apps/*/.gitignore`; the root `.gitignore` holds only shared rules.
