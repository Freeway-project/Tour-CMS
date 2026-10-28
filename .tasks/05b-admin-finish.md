# Task 05b — Finish and fix the owner admin

Read `AGENTS.md` and `.tasks/05-owner-admin.md` first. Task 05 is partly done: migrations 0003, content in Supabase, cron worker, middleware, login, and the admin pages Today, Calendar, Inquiries, Tours list, Settings, FAQs, Reviews, Publish exist. Fix the bugs below, then build what's missing.

## A. Fixes from review (do these first)
1. **Redirect loop:** in `src/middleware.ts`, when Supabase isn't configured, `/admin/login` redirects to `/admin/login?error=not_configured`, which redirects again forever. The login page must always render (show "Admin is not configured yet" when there's no Supabase). Also match only `/admin` and `/admin/...`, not `/administrator`. Remove the duplicated `if (!supabase)` branches.
2. **Middleware test (required by the spec, was deleted):** move the auth decision into a pure function in `src/lib/admin-guard.ts`, e.g. `adminGuard({ path, configured, userId, isAdmin }) → { action: 'next' } | { action: 'redirect', to }`, call it from the middleware, and test it in `src/lib/admin-guard.test.ts` (not configured → login renders, no loop; no user → `/admin/login`; user but not admin → `/admin/login?error=not_admin`; admin → next; `/administrator` and public pages → next).
3. **Publishing must not use the service-role key.** `src/lib/publish.ts` takes the logged-in admin's Supabase client (RLS allows admins to update `site_settings`). On Cloudflare, a fire-and-forget `fetch` can be cancelled when the response ends: pass the request's `waitUntil` (`Astro.locals.runtime.ctx.waitUntil` from the Cloudflare adapter) and use it when available.
4. **Validate every admin form with zod** before writing (shared schemas in `src/lib/admin-schemas.ts`): emails, URLs, lengths, ratings 1–5, prices via `src/lib/money.ts`. Show the field errors on the page.
5. Remove the `as never` casts in `src/lib/supabase-server.ts` and `src/worker.ts` (type the cookie options with `CookieOptions` from `@supabase/ssr`; type the manifest with the adapter's exported type, or `SSRManifest` from `astro`).

## B. Missing admin pages (same style as the existing ones: plain forms, POST to the same page, user session, `prerender = false`, mobile first)
1. `src/pages/admin/tours/new.astro` and `src/pages/admin/tours/[id].astro`: create/edit a tour (title, slug auto from title and editable, short description, description, highlights, includes, important info, duration in hours and minutes, status, private or not, sort order). Hide instead of delete.
2. On the tour edit page, a **Packages** section: add/edit/deactivate packages (name, pricing mode per person/per vehicle, prices in dollars → cents, max people required for per vehicle, includes, sort order, active). Show "plus 13% HST" next to price fields. Same for **Add-ons**.
3. On the tour edit page, a **Photos** section: upload to the `tour-images` bucket with the user's session (client-side resize to max 2400 px in a small `<script>`, required alt text, read width/height), reorder, choose hero, delete.
4. `src/pages/admin/pickups.astro`: pickup locations (name, address, lat/lng optional, note, active) and per-tour pickup times.
5. Calendar: manage **schedules** (weekdays, time, capacity, from/to dates, active) and **blackout dates**; close/reopen a departure, change its capacity (never below seats taken; show a friendly error), add a one-off departure. After saving a schedule, call `generate_departures` through a new admin-callable SQL wrapper `public.admin_generate_departures()` (security definer, checks `public.is_admin()`, grant execute to authenticated) in a new migration `0004_admin_functions.sql`, with a PGlite test that a non-admin gets an error.
6. `src/pages/admin/bookings/[id].astro`: booking detail (all fields, add-on snapshot, Toronto time), cancel with confirmation, edit notes. Link to it from the Today page.
7. `src/pages/admin/bookings.csv.ts`: CSV export for a date range (admin only, correct CSV escaping, `Content-Disposition: attachment`). Test the escaping helper.
8. A shared admin layout `src/layouts/Admin.astro` with the nav (Today, Requests, Calendar, Tours, Pickups, FAQs, Reviews, Settings, Publish now, Log out), `<meta name="robots" content="noindex">`, and the "Changes go live in about 2 minutes" notice after a save. Use it on every admin page.

## Acceptance criteria
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass with no `.env`
- `grep -rn "getAdminClient\|SERVICE_ROLE" src/pages/admin src/lib/publish.ts` finds nothing
- No `any`, `as never`, `@ts-ignore` or disabled lint rules
- Public pages unchanged: homepage 0 scripts, tour page JS ≤ 15 KB gzipped
- Only stop processes you started, by PID. Don't touch git.
