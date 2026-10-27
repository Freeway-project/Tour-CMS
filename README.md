# Tour CMS

Marketing and booking site for a one-person Toronto tour operator (Niagara Falls day tours).
Paid-ad traffic lands here, so speed and conversion come first.

One Astro 5 app at the repo root, deployed to Cloudflare Pages. Tours, packages, departures and
bookings live in Supabase; marketing copy lives in JSON content collections.

## Prerequisites

- Node 22 (see `.nvmrc`)
- pnpm 9 (`corepack enable`)

## Commands

```sh
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

- `pnpm dev` — Astro dev server
- `pnpm preview` — build first, then `wrangler pages dev ./dist` to run the worker locally
- `pnpm format` / `pnpm format:check` — Prettier

## Folder layout

```
src/pages          Routes (prerendered unless a route sets `prerender = false`)
src/pages/api      Server routes, e.g. /api/health
src/components     Astro components
src/layouts        Page layouts
src/styles         Tailwind entry and design tokens
src/content        Marketing copy (FAQs, reviews, site settings) as JSON
src/data           Fixture catalogue used when Supabase is not configured
src/lib            Domain types, pricing, formatting and the Supabase data layer
supabase           SQL migrations, seed and PGlite schema tests
```

## Environment

Copy `.env.example` to `.env` and fill in the Supabase values:

| Variable                    | Scope                    |
| --------------------------- | ------------------------ |
| `PUBLIC_SUPABASE_URL`       | client, public, optional |
| `PUBLIC_SUPABASE_ANON_KEY`  | client, public, optional |
| `SUPABASE_SERVICE_ROLE_KEY` | server, secret, optional |

Everything is optional: without a `.env` the site builds and renders from the fixtures in
`src/data/fixtures.ts`. Never import the service role key into client code.

## Database

SQL lives in `supabase/migrations`. Run the migration and `supabase/seed.sql` against a Supabase
project, or locally through PGlite with `pnpm test` (no Docker or network needed).
