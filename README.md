# Estudando IA

Repositório com os projetos que desenvolvo enquanto estudo IA. Cada projeto vive em sua própria pasta dentro de [projetos/](projetos/), com suas dependências, `.gitignore` e documentação independentes.

## Projetos

| Projeto | Descrição | Stack |
| --- | --- | --- |
| [feed-social](projetos/feed-social) | Feed de posts com perfis, curtidas e comentários. Monorepo pnpm com frontend e API. | React 19, TypeScript, Vite, Tailwind, ASP.NET Core (.NET 9), PostgreSQL |
| [pokedex](projetos/pokedex) | Pokédex imersiva consumindo a PokéAPI, com foco em acessibilidade (WCAG 2.2 AA). | React, TypeScript, Vite, SCSS, Framer Motion, TanStack Query |
| [rotalog](projetos/rotalog) | Gestão de frotas e entregas (projeto legado do curso Alura). 3 APIs e 2 frontends em monorepo Nx, com PostgreSQL via Docker Compose. | Java 11/Spring Boot, Node 18/Express, .NET 9, Angular 18, React 18, PostgreSQL |

## Como usar

Entre na pasta do projeto e siga o README ou o CLAUDE.md dele:

```bash
cd projetos/pokedex
npm install
npm run dev
```

## Adicionando um novo projeto

Crie uma pasta em `projetos/<nome-do-projeto>` com seu próprio `.gitignore` e README, e acrescente uma linha na tabela acima.
