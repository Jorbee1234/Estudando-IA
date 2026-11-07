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
pnpm test             # Vitest, web only; there are no tests for the API yet
pnpm web test src/components/atoms/Button.test.tsx   # run a single test file
pnpm preview          # serve the built frontend
pnpm start:api        # run the API without watch
```

`pnpm web <script>` and `pnpm api <script>` run any script in that app (for example `pnpm api restore` or `pnpm api clean`).

`pnpm dev:web` does not type-check; type errors only surface through `tsc -b` in the web build.

## Architecture

The frontend reaches the API through same-origin `/api` paths:

1. Frontend code calls the `api<T>()` helper in `apps/web/src/lib/api.ts` (no screen uses it yet), passing a path without the prefix (`api('/health')`). The helper prepends `/api`, throws on non-2xx responses, and returns `undefined` on 204.
2. In development, the Vite proxy in `apps/web/vite.config.ts` forwards `/api` to `http://localhost:5164`.
3. Controllers in `apps/api/Controllers` handle the request. They use `[Route("api/[controller]")]`, so `HealthController` serves `/api/health`.

Because of the proxy, the API has no CORS configuration. Nothing in the repo yet defines how `/api` is routed in production: the proxy applies only to the Vite dev server, and the API does not serve the frontend's static files.

The API port (5164) is hardcoded in three places that must stay in sync: `apps/api/Properties/launchSettings.json`, `apps/web/vite.config.ts`, and `apps/api/Api.http`.

In the Development environment the API exposes Swagger UI at `/swagger` (Swashbuckle; document at `/swagger/v1/swagger.json`); outside Development it enables HTTPS redirection instead. The Swagger UI has an **Authorize** button: paste the `accessToken` returned by `POST /api/tokens`.

### Authentication

- `POST /api/users` registers a user, `POST /api/tokens` logs in and returns a JWT, and `GET /api/users/me` (`[Authorize]`) returns the logged-in user.
- Users live in `InMemoryUserStore` (singleton): they are lost on every API restart. Passwords are hashed with `PasswordHasher<User>`.
- JWT settings are in the `Jwt` section of `appsettings.json`. `Jwt:SecretKey` (at least 32 characters) is set only in `appsettings.Development.json`; in production provide it through the `Jwt__SecretKey` environment variable, otherwise the API fails on startup.
- Inbound claim mapping is off (`MapInboundClaims = false`), so read the user id from the `sub` claim, not `ClaimTypes.NameIdentifier`.

## Frontend conventions

- **Atomic Design:** organize components by level under `apps/web/src/components/`: `atoms`, `molecules`, `organisms`, `templates`, `pages`. A component may only be composed from levels below its own.
- **Tailwind CSS:** style with Tailwind utility classes rather than new component CSS files. Design tokens (colors, font) live in the `@theme` block in `apps/web/src/index.css`.
- **Tests:** every component must have a test, next to it as `<Component>.test.tsx`, covering its essential usage. Tests use Vitest and Testing Library, and import from `vitest` explicitly because globals are off.
- **Auth screens:** `AuthTemplate` holds the layout shared by `LoginPage` and `SignupPage`; it receives the banner, texts, and form content as props.
- **Routing:** `react-router` (`BrowserRouter` in `main.tsx`, routes in `App.tsx`: `/login`, `/cadastro`). Internal links use `TextLink`, which wraps the router's `Link`, so components that render it need a router in tests (`MemoryRouter`).
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
- **Layered system:** clients depend only on the HTTP contract, never on what sits behind it.

## Git

All commits, in both apps, follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

- **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **Scopes:** `web` or `api`; omit the scope for changes that span both apps or only touch the repository root.
- **Breaking changes:** add `!` after the type or scope, and a `BREAKING CHANGE:` footer describing the change.

App-specific ignore rules belong in `apps/*/.gitignore`; the root `.gitignore` holds only shared rules.
