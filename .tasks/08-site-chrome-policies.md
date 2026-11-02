# Task 08 — Shared header and footer, policy pages, 404, robots.txt

Read `AGENTS.md` first and follow it. Builds on tasks 03–07. Before the site can run paid ads,
Google Ads and Stripe both expect a reachable privacy policy, terms and cancellation policy, and
every page needs a way back home. Today only the home page has a footer; the owner can edit a
cancellation policy and an announcement in `/admin/settings`, but neither is shown anywhere.

## 1. Migration `0008_policy_pages.sql`
- Add to `public.site_settings`: `privacy_policy text not null default ''` and
  `terms text not null default ''` (markdown, same as `cancellation_policy`).
- No new grants needed: check that anon can still read `site_settings` and cannot write it.
- Add the file to `MIGRATIONS` in `supabase/tests/database.ts`. Extend `supabase/seed.sql` with
  values that start with `TODO:` (the owner writes the real text; never invent legal text).
- Map the new columns in `src/lib/db/` and `SiteSettings` (`privacyPolicy`, `terms`), and give the
  fixtures in `src/data/fixtures.ts` `TODO:` values too.

## 2. Admin
In `/admin/settings`, add two markdown textareas ("Privacy policy", "Terms and conditions") next to
the cancellation policy, validated with the existing settings schema in `src/lib/admin-schemas.ts`
(same limits as `cancellation_policy`). Saving must trigger the same publish/rebuild path as the
other settings fields.

## 3. Shared header and footer
- New `src/components/SiteHeader.astro`: the site name linking to `/`, and one "Tours" link to
  `/#tours`. Nothing else, no JS, no hamburger menu.
- Move the home page footer into `src/components/SiteFooter.astro` (same content and placeholder
  rules as task 07) and add links to the policy pages that are **not** placeholders.
- New `src/components/AnnouncementBar.astro`: rendered above the header only when
  `announcement.enabled` and the text is not a placeholder; link it when `href` is set.
- Use header, announcement and footer on the home page, the tour page, `/booking/confirmed`,
  `/booking/inquiry-sent` and the new pages below. **Not** on `/admin/*`.
- The tour page keeps its booking widget above the fold at 375×812 and 1280×800; the header must
  be short enough not to push it down (one line, ≤ 56px).

## 4. Policy pages
- `/cancellation-policy/`, `/privacy/`, `/terms/`: `prerender = true`, one `<h1>`, the text
  rendered with the existing safe `renderMarkdown` (extend it for headings `##`/`###` and `-`
  lists only if needed, with tests). Read the text from `getSiteSettings()`.
- While a policy is a placeholder (see `isPlaceholder`): the page is still built but says
  "This page is being updated. Questions? Email …" (email only if real), carries
  `<meta name="robots" content="noindex">`, and is left out of the footer and the sitemap.
- On the tour page, next to the booking widget's price summary or under it, show
  "Free cancellation details" linking to `/cancellation-policy/` only when the policy is real.

## 5. 404 and robots.txt
- `src/pages/404.astro` (`prerender = true`): header, footer, "Page not found", a link to each
  visible tour and to the home page. Must return status 404 on the Cloudflare build.
- `src/pages/robots.txt.ts` (prerendered): allow everything except `/admin/`, `/api/` and
  `/booking/`, and point to `sitemap-index.xml` on `Astro.site`.
- Exclude `/admin/`, `/api/`, `/booking/`, the 404 and the policy pages from the sitemap
  (sitemap `filter` in `astro.config.mjs`). The config cannot read the database, so all policy
  pages are left out rather than only the placeholder ones; they are reachable from the footer.

## 6. No placeholders in customer emails (found while doing §4)
Booking emails printed the cancellation policy, phone, WhatsApp and address even while they were
`TODO:` values. Leave out any field that `isPlaceholder` flags; with no real contact detail, say
"Reply to this email and we will help." Test it with the fixtures.

## Acceptance criteria
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass with no `.env`.
  `pnpm` is not on PATH on this machine: run it as `npx -y pnpm@9.15.9 <script>`.
- Tests: the migration (columns exist, defaults, anon read-only), the settings schema accepts and
  limits the new fields, the robots.txt body, and any markdown additions.
- Home and policy pages ship **0** `<script>` tags; tour page JS budget unchanged (≤ 15 KB gzipped).
- `grep -ri "todo" dist/` finds nothing in any public HTML page (admin pages excluded).
- Every new link has descriptive text and `focus-visible` styles; colour contrast AA; one `<h1>`
  per page.
- No new dependencies. No `any`, `as never`, `@ts-ignore` or disabled lint rules.
- Do **not** connect to the real Supabase project or apply the migration anywhere; tests use PGlite.
  The orchestrator applies 0008.
- Done by the orchestrator (Claude Code), not OpenCode: the OpenCode free tier hit its usage limit.
- A dev server is already running on port 4321 in tmux session `tour-dev` (someone is viewing it
  through a tunnel). Do not stop or restart it; if you need your own server use another port and
  stop it by PID when done.
- Don't touch git. End with a short report: files changed, acceptance results, anything you could
  not do.
