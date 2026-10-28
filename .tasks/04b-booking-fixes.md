# Task 04b — Fixes from the task 04 review

Read `AGENTS.md` first. Small, scoped fixes only.

## 1. Forms must work without JavaScript (progressive enhancement)
The tour pages are prerendered, so a no-JS `POST` of `#booking-form` or `#inquiry-form` hits a static file and the Action never runs. Fix:
- Add `src/pages/booking/reserve.ts` and `src/pages/booking/inquire.ts` (`prerender = false`, `POST` only, any other method → 405).
- Each one reads the form data, calls the action through `context.callAction(actions.reserveBooking, formData)` (and `createInquiry`), then answers with a **303** redirect:
  - success: `/booking/confirmed?ref=<reference>` or `/booking/inquiry-sent`
  - error: back to `/tours/<slug>/?error=<code>#book`, where `<code>` is a short key (`seats`, `departure`, `package`, `addon`, `people`, `private`, `invalid`, `unavailable`, `unknown`). Read the tour slug from a hidden `tourSlug` field (validate it against `^[a-z0-9-]+$`).
- Point both forms' `action` attribute at these routes. The JS-enhanced path stays as it is (fetching the action and redirecting in the browser).
- On the tour page, a few lines of inline script (or the existing widget script) read `?error=` and show the matching friendly message in the existing `aria-live` region. Keep the message text in one map shared with `messageForDbError` (move both to `src/lib/booking-errors.ts`).
- Test: `src/lib/booking-errors.test.ts` maps each DB error string to the right code and message.

## 2. Server output config
`astro.config.mjs` is now `output: 'server'`. Every page that doesn't need the server must keep `export const prerender = true`. Add a vitest test `src/pages/prerender.test.ts` that reads every file under `src/pages/` and fails if a `.astro` or `.ts` page has no `prerender` export, so a new page can't silently become server-rendered.

## Acceptance criteria
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass with no `.env`
- Tour-page JS still ≤ 15 KB gzipped; homepage still 0 scripts
- Don't stop processes with a broad `pkill -f`. Only stop processes you started, by PID.
- Don't touch git.
