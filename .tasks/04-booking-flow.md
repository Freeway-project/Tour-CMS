# Task 04 — Tour page + booking flow (reserve seats, no payment yet)

Read `AGENTS.md` first and follow it. Builds on task 03 (single Astro app, Supabase schema, `reserve_booking`, `pricing.ts`, fixtures fallback).

## Goal
A customer can open a tour page, pick a package, date, people, add-ons and pickup, see the live price with HST, enter their details and reserve seats. Payment comes in task 05, so for now a successful reservation goes straight to a confirmation page.

## 1. Tour page `src/pages/tours/[slug].astro` (prerendered)
- `getStaticPaths` from `getTours()` (works with fixtures when there's no `.env`).
- Neutral, clean layout using Tailwind and the existing tokens (real design comes later). Sections in this order:
  1. Title, short description, duration, "from" price (`formatCad`), rating summary from the `site` collection
  2. Packages: one card each with name, adult/child/senior price, `includes` list
  3. Description (render the markdown)
  4. Pickup locations with times
  5. Booking widget (section 2 below), with `id="book"`
  6. Up to 3 featured reviews and the FAQs (native `<details>`)
- Mobile: a sticky bottom bar with "from $X" and a "Book now" link to `#book`, respecting `env(safe-area-inset-bottom)`.
- SEO: `<title>`, meta description, canonical, and JSON-LD `Product` with `offers` (lowest price, CAD) and `aggregateRating` from the site ratings.
- For tours with `isPrivate: true` show the private inquiry form (section 4) instead of the booking widget.

## 2. Booking widget `src/components/booking/BookingWidget.astro`
- Server-rendered HTML form that **works as a progressive enhancement**, plus a small vanilla TypeScript `<script>` (no framework). **Budget: ≤ 15 KB gzipped JS** for the tour page.
- Packages, add-ons and pickups come from the prerendered tour data and are embedded as JSON in a `<script type="application/json">` tag. Only availability is fetched live.
- Fields: package (radio cards), date (list of the next available departures grouped by week, each showing time and "N seats left"; disabled when 0), adults/children/seniors steppers (0–7, at least 1 person total), add-ons (checkbox for per-booking, quantity for per-person), pickup location (select), name, email, phone, notes.
- Live summary box: line items, subtotal, HST 13%, total, recomputed on every change by importing `quote()` from `src/lib/pricing.ts`. Label it "Price shown includes HST".
- Disable submit, with a short reason, when: no departure picked, more people than seats left, or no people.
- All inputs labelled, errors announced with `aria-live="polite"`, visible focus.

## 3. Server
- `src/pages/api/availability.ts` (`prerender = false`): `GET ?tour=<slug>&from=YYYY-MM-DD&days=45` → `[{ departureId, startsAt, seatsLeft }]` from the `departure_availability` view (open, future, seatsLeft > 0 only). Header `Cache-Control: public, s-maxage=30`. When there's no Supabase env, return fixture departures (generate the next 30 days at 08:00 Toronto time, 7 seats).
- Astro **Actions** in `src/actions/index.ts`:
  - `reserveBooking` (accept: 'form'): zod-validate every field (uuids, ints 0–7, email, phone 7–20 chars, name 2–80, notes ≤ 500, addons array). Call `reserve_booking` through a **server-only** Supabase client created with `SUPABASE_SERVICE_ROLE_KEY` in `src/lib/db/admin.ts`. Map the DB errors `not_enough_seats`, departure closed or past, and invalid package or add-on to friendly `ActionError` messages. On success, redirect to `/booking/confirmed?ref=<reference>`.
  - When Supabase isn't configured: return a clear `ActionError` "Bookings are not configured yet". Don't fake a booking.
- `src/pages/booking/confirmed.astro` (`prerender = false`): look up the booking by `ref` with the admin client and show the reference, tour, date and time in Toronto time, people, pickup and total. Unknown ref → friendly 404 message. Never show other customers' data. Only look up by exact reference.

## 4. Private tour inquiry
- `src/components/booking/InquiryForm.astro`: preferred date, group size (1–20), name, email, phone, message.
- Action `createInquiry` → insert into `inquiries` with the admin client → redirect to `/booking/inquiry-sent`.

## 5. Spam and abuse basics
- Hidden honeypot field on both forms (reject silently if filled).
- Server-side: reject requests whose `Origin` header doesn't match the site (Astro's `security.checkOrigin`, on by default for server routes, must stay enabled).

## 6. Tests (vitest)
- `src/actions/schemas.test.ts`: the zod schemas accept a valid booking and reject bad email, 0 people, 8 adults, and a non-uuid package.
- `src/lib/availability.test.ts`: the fixture departure generator returns 30 departures at 08:00 America/Toronto (check the UTC offset across a DST change).
- `src/lib/pricing.test.ts`: add a case with seniors and a per-booking add-on.

## Acceptance criteria
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass with **no `.env`**
- `dist/tours/<slug>/index.html` exists for each fixture tour. Homepage still ships 0 KB JS. Tour page JS ≤ 15 KB gzipped (state the measured size in your summary).
- No `any`, no `@ts-ignore`, no disabled lint rules

## Do NOT
- add Stripe, email sending or `/admin` (task 05 and later)
- add a UI framework or date-picker library
- touch git
