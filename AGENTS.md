# Tour-CMS — agent instructions

Marketing and booking website for a one-person Toronto tour operator (Niagara Falls tours). Domain: torontoniagara.ca.
Its job is to turn **paid-ad traffic** (Google Ads, Meta) into bookings, so **speed and conversion come first**.
The owner must be able to change tours, packages, prices and dates, and see bookings, without a developer.

## Stack (do not change without being told)
- **One Astro 5 app at the repo root** (no monorepo), pnpm 9, Node 22, TypeScript `strict`
- Tailwind CSS 4. No React/Vue unless a task asks for an island.
- Hosting: **Cloudflare** via `@astrojs/cloudflare`. Pages are **prerendered by default**; only routes that need the server set `export const prerender = false`.
- **Supabase** (Postgres + Auth) for tours, packages, add-ons, departures, bookings, and the owner's admin login. SQL lives in `supabase/migrations/`.
- Marketing copy (FAQ, reviews, site settings, page text) lives in **Astro content collections** in `src/content/`.
- Payments: Stripe Checkout (later task). Email: a free-tier transactional email API (later task).

## Hard rules
1. **Performance budget per page:** ≤ 50 KB JS (gzipped), LCP < 1.5 s on mobile 4G, CLS < 0.05, Lighthouse ≥ 95 in every category.
2. No client-side JS unless needed. Prefer `<script>` in an Astro component or a `client:visible`/`client:idle` island. Never `client:load` without a reason in a comment.
3. Images: use `astro:assets` `<Image>`/`<Picture>` (AVIF + WebP), always set width/height, lazy-load below the fold, `fetchpriority="high"` on the hero only.
4. Fonts: self-hosted, `font-display: swap`, preload only the one weight used above the fold.
5. Third-party scripts (GTM, pixels, Stripe) must never block render. Load them after consent and/or on interaction.
6. Accessibility: semantic HTML, labelled controls, visible focus (`focus-visible`), colour contrast AA.
7. **Money is integer cents** everywhere (DB and TS). Currency CAD. Ontario HST 13% is computed on the server, never trusted from the browser.
8. **Secrets:** `SUPABASE_SERVICE_ROLE_KEY` and any other secret is server-only (declared with `astro:env` as `context: "server", access: "secret"`). Never import it into client code. Use `.env` (gitignored) and keep `.env.example` up to date.
9. Every Supabase table has **RLS enabled**. The anonymous role can only read public catalogue data. Bookings are never readable or writable by anon directly.
10. Keep changes scoped to the task. Don't reformat unrelated files or add dependencies the task didn't ask for.
11. **No business data in code.** Anything a customer reads about the business (tour names, prices, inclusions, times, pickup points, phone numbers, policies, FAQs, reviews) comes from Supabase so the owner can change it in `/admin`. Code holds layout and the fallback fixtures in `src/data/fixtures.ts` only.
12. Don't run `git commit`, `git push` or anything that touches git history. The orchestrator handles git.

## Commands (must all pass before a task is done)
```
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Conventions
- File names: kebab-case. Components: PascalCase `.astro`.
- Locale `en-CA`, timezone `America/Toronto`.
- SQL: snake_case. TS: camelCase. Map between them in `src/lib/db/`.
