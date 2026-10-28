# Task 05 — Owner admin: everything on the site is editable without a developer

Read `AGENTS.md` first and follow it. Builds on tasks 03, 04a and 04.

## Goal
The owner is one non-technical person who works from a phone. They must be able to change **everything about the business** from `/admin` with no code change or developer: tours, prices, what's included, photos, pickup points and times, dates and seats, contact details, FAQs, reviews, announcements, and see/manage bookings and private-tour requests.

**Rule from now on:** no business data in code. Anything a customer can read about the business (names, prices, inclusions, times, phone numbers, policies, FAQs, reviews) comes from Supabase. Code holds only layout and fallback fixtures for builds without `.env`.

## 1. Move remaining content into Supabase — `supabase/migrations/0003_owner_content.sql`
- `site_settings` (single row, `id int primary key default 1 check (id = 1)`): name, tagline, phone, whatsapp, email, address, hst_number, cancellation_policy (markdown), announcement_enabled, announcement_text, announcement_href, ratings jsonb (`[{platform, score, count, url}]`), updated_at.
- `faqs`: id, question, answer (markdown), tour_id null (null = shown everywhere), sort_order, is_active.
- `reviews`: id, author, location, rating 1–5, text, review_date date, source check in (google, tripadvisor, viator, direct), tour_id null, featured bool, is_active.
- `tour_images`: id, tour_id cascade, storage_path, alt text not null, width int, height int, sort_order, is_hero bool. Supabase Storage bucket `tour-images` (public read, admin-only write via storage policies).
- `tours`: add `highlights text[]` and `important_info text` (markdown, e.g. "Attraction tickets aren't included. We'll help you buy them on the day.").
- Seed all of it from the current `src/content/*.json` and the 04a data, then **delete the `faqs`, `reviews` and `site` content collections** and read them through `src/lib/db/` (with fixture fallback when there's no `.env`).
- RLS: anon reads active rows only; admins full access. Same pattern as 0001.

## 2. Recurring schedules instead of typing every date
- `schedules`: id, tour_id cascade, weekdays int[] (0 = Sunday … 6), start_time time, capacity int > 0, valid_from date, valid_to date null, is_active.
- `blackout_dates`: tour_id null (null = all tours), date, reason.
- SQL function `public.generate_departures(p_days int default 120)` (security definer, service_role only): creates missing `departures` from active schedules for the next `p_days` days in America/Toronto time (DST-safe), skipping blackout dates. It never deletes or changes existing departures (they may have bookings). Idempotent thanks to the `(tour_id, starts_at)` unique key.
- Replace the hard-coded 30-day departure insert in the seed with a schedule (day tour: every day, 08:00, capacity 11) plus a call to `generate_departures`.
- Cloudflare cron: `wrangler.jsonc` `triggers.crons = ["0 9 * * *"]` and a scheduled handler that calls `generate_departures` with the service-role key. This also keeps the free Supabase project from pausing.

## 3. Admin app `/admin` (all routes `prerender = false`, `noindex`)
- Login: Supabase Auth email + password, session in httpOnly cookies via `@supabase/ssr`. Astro middleware protects `/admin/*` (except `/admin/login`) and requires `public.is_admin()`. All writes go through Astro Actions that use the **user's** session (RLS enforces admin), not the service-role key.
- Mobile-first, plain HTML forms + Actions, Tailwind. No UI framework. Big tap targets, one column on phones. Every save shows a clear "Saved" or a plain-English error.
- Pages:
  1. **Today / Bookings** (home): upcoming departures with seats taken/left and the list of bookings (name, people, pickup, phone with `tel:` and WhatsApp links). Filters: date range, status. Booking detail: change status (cancel), edit notes. CSV export.
  2. **Private requests**: inquiries list, mark contacted/closed, tap-to-call/WhatsApp/email.
  3. **Calendar**: next 60 days per tour; close/reopen a departure, change its capacity (never below seats already taken), add a one-off departure. Manage schedules and blackout dates.
  4. **Tours**: create/edit/hide/reorder tours: title, slug (auto from title, editable), short description, description, highlights, includes, important info, duration, status, private or not. Photos: upload (resized client-side to max 2400 px before upload), alt text required, reorder, pick hero.
  5. **Packages & add-ons** (inside each tour): name, pricing mode (per person / per vehicle), prices in dollars (convert to cents on the server), max people, includes, active, order.
  6. **Pickups**: locations and per-tour pickup times.
  7. **Site settings**, **FAQs**, **Reviews**: edit everything from section 1.
- Input in dollars, stored in cents; show "plus 13% HST" next to price fields.

## 4. Publishing changes to the public site
Public pages stay prerendered for speed, so content changes need a rebuild:
- Secret env `CF_DEPLOY_HOOK_URL` (server, secret, optional). After any catalogue/content save, call it (fire-and-forget, max once per 60 s; store last trigger time in `site_settings.last_publish_at`).
- Admin header shows "Changes go live in about 2 minutes" after a save, and a manual **Publish now** button.
- Not affected by rebuilds: availability and seats left (already live via `/api/availability`) and bookings.
- Images: remote images from the Supabase Storage domain are optimized at build time by `astro:assets` (add the domain to `image.remotePatterns`).

## 5. Tests
- PGlite: `generate_departures` creates the right local times across a DST change, skips blackout dates, is idempotent, doesn't touch existing departures. Anon can't write any admin table; anon can't read inactive FAQs/reviews or hidden tours.
- vitest: dollars→cents parsing (`"99"`, `"99.5"`, `"1,099.00"`, rejects negatives/garbage), slug generation.
- Middleware: unauthenticated `/admin` redirects to `/admin/login`.

## Acceptance criteria
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass with no `.env`
- `grep -rn "York St\|9900\|maple" src` finds nothing outside `src/data/fixtures.ts` and tests
- Public pages still meet the AGENTS.md budgets (homepage 0 scripts)
- No `any`, no `@ts-ignore`, no disabled lint rules

## Do NOT
- add Stripe or email (task 06)
- use the service-role key in admin Actions (only the cron and `reserveBooking` use it)
- touch git
