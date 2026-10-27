# Tour-CMS — agent instructions

Marketing and booking website for a Toronto tour operator (Niagara Falls day tours and more).
Its job is to turn **paid-ad traffic** (Google Ads, Meta) into bookings, so **speed and conversion come first**.

## Stack (do not change without being told)
- pnpm workspaces monorepo, Node 22, pnpm 9, TypeScript `strict` everywhere
- `apps/web`: Astro 5 (static output by default), Tailwind CSS 4, no React/Vue unless a task asks for an island
- `apps/studio`: Sanity Studio v4
- `packages/ui`: shared Astro components and design tokens
- `packages/schema`: Sanity schema definitions + generated TS types, imported by both apps
- Hosting: Cloudflare Pages (`@astrojs/cloudflare` adapter only if a task needs SSR)

## Hard rules
1. **Performance budget per page:** ≤ 50 KB JS (gzipped), LCP < 1.5 s on mobile 4G, CLS < 0.05, Lighthouse ≥ 95 in every category.
2. No client-side JS unless needed. Prefer `<script>` in an Astro component or a `client:visible`/`client:idle` island. Never `client:load` without a reason in a comment.
3. Images: use `astro:assets` `<Image>`/`<Picture>` (AVIF + WebP), always set width/height, lazy-load below the fold, `fetchpriority="high"` on the hero only.
4. Fonts: self-hosted, `font-display: swap`, preload only the one weight used above the fold.
5. Third-party scripts (GTM, pixels, booking widget) must never block render. Load them after consent and/or on interaction.
6. Accessibility: semantic HTML, labelled controls, visible focus, colour contrast AA.
7. No secrets in the repo. Use `.env` (gitignored) and add each new variable to `.env.example`.
8. Keep changes scoped to the task. Don't reformat unrelated files or add dependencies the task didn't ask for.
9. Don't run `git commit`, `git push` or anything that touches git history. The orchestrator handles git.

## Commands (must all pass before a task is done)
```
pnpm install
pnpm lint
pnpm typecheck
pnpm build
```

## Conventions
- File names: kebab-case. Components: PascalCase `.astro`.
- Currency CAD, locale `en-CA`, timezone `America/Toronto`.
- Content comes from Sanity. Until a task wires it up, use typed fixtures in `apps/web/src/data/`.
