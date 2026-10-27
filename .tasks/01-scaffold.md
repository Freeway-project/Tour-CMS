# Task 01 — Monorepo scaffold

Read `AGENTS.md` first and follow it.

## Goal
An empty but fully working pnpm monorepo where `pnpm install && pnpm lint && pnpm typecheck && pnpm build` passes from a clean clone.

## Create exactly this
```
/package.json            name "tour-cms", private, packageManager "pnpm@9.15.9", engines node ">=22"
                         scripts: dev, build, lint, typecheck, format (run across workspaces with `pnpm -r`)
/pnpm-workspace.yaml     apps/*, packages/*
/.npmrc                  auto-install-peers=true
/.nvmrc                  22
/.gitignore              node_modules, dist, .astro, .env, .env.*, !.env.example, .DS_Store, .sanity, coverage, .lighthouseci
/.editorconfig           2 spaces, LF, utf-8, final newline
/.prettierrc             with prettier-plugin-astro
/eslint.config.js        flat config: typescript-eslint + eslint-plugin-astro
/tsconfig.base.json      strict, moduleResolution "bundler", target ES2022
/README.md               short: what it is, prerequisites, the four commands, folder layout

/apps/web                Astro 5 project ("@tour-cms/web")
  astro.config.mjs       output "static", site "https://example.com" (placeholder), Tailwind 4 via @tailwindcss/vite, sitemap integration
  src/layouts/Base.astro <html lang="en-CA">, meta viewport, title/description props, canonical, OG tags
  src/pages/index.astro  placeholder hero: H1 "Niagara Falls Tours from Toronto", one paragraph, one "Book now" link (#), uses Base layout
  src/styles/global.css  Tailwind import + CSS custom properties for colours (--color-brand, --color-ink, --color-bg) and font stack
  tsconfig.json          extends astro/tsconfigs/strict

/apps/studio             Sanity Studio v3 ("@tour-cms/studio")
  sanity.config.ts       projectId and dataset read from env SANITY_STUDIO_PROJECT_ID / SANITY_STUDIO_DATASET, structureTool + visionTool, schema types imported from @tour-cms/schema
  sanity.cli.ts
  .env.example           SANITY_STUDIO_PROJECT_ID=, SANITY_STUDIO_DATASET=production
  build must succeed without a real project ID (fall back to "placeholder")

/packages/schema         ("@tour-cms/schema") exports `schemaTypes` array containing ONE example type `siteSettings` (title, phone, email)
/packages/ui             ("@tour-cms/ui") exports one `Button.astro` (props: href, variant "primary"|"secondary") and a tokens.css

/.github/workflows/ci.yml   on PR + push to main: setup pnpm 9 + node 22 with cache, install --frozen-lockfile, lint, typecheck, build
/.env.example               at root listing all env vars used
```

## Acceptance criteria
- `pnpm install && pnpm lint && pnpm typecheck && pnpm build` all exit 0
- `apps/web/dist/index.html` exists and ships **0 KB of JS** (no `<script type="module">` from Astro)
- No `any` types, no disabled lint rules
- Use current stable versions. Don't pin anything to a beta.

## Do NOT
- add React, Vue, or any UI kit
- add booking, analytics or tracking code (later tasks)
- touch git
