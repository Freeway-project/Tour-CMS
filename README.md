# Tour CMS

Marketing and booking site for a Toronto tour operator (Niagara Falls day tours and more),
plus the Sanity Studio the team uses to edit content. Paid-ad traffic lands here, so speed
and conversion come first.

## Prerequisites

- Node 22 (see `.nvmrc`)
- pnpm 9 (`corepack enable`)

## Commands

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm dev` runs the site and the Studio together.

## Folder layout

```
apps/web         Astro 5 marketing site (static output, Tailwind 4)
apps/studio      Sanity Studio v3
packages/schema  Sanity schema types, shared by the Studio and the site
packages/ui      Shared Astro components and design tokens
```

## Environment

Copy `.env.example` to `.env` (and `apps/studio/.env.example` to `apps/studio/.env`) and fill in
the Sanity project ID. Builds work without it by falling back to a placeholder project.
