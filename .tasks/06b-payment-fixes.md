# Task 06b — Fixes from the task 06 review

Read `AGENTS.md` first. Small, scoped fixes to the payment flow from task 06.

## 1. A stale Checkout Session must not expire a live booking
`/booking/pay` creates a new Checkout Session for a booking whose first session was abandoned. When the **old** session later fires `checkout.session.expired`, the webhook currently sets the booking to `expired` even though the customer may be paying on the new session.
- In `src/pages/api/stripe-webhook.ts`, only expire the booking when `bookings.stripe_checkout_session_id` equals the expired event's session id (and status is still `pending`).
- Unit-test this decision as a pure helper (e.g. `shouldExpire(booking, sessionId)`).

## 2. Only treat a session as paid when Stripe says it is paid
For `checkout.session.completed`, call `mark_booking_paid` only when `session.payment_status === 'paid'`. Also handle `checkout.session.async_payment_succeeded` the same way (and ignore `async_payment_failed` apart from logging). Test the event → action mapping as a pure helper.

## 3. Payment on a cancelled booking must reach the owner
If Stripe reports a payment for a booking that is `cancelled` or `refunded`, `mark_booking_paid` returns `changed = false` and nobody hears about it. Make `mark_booking_paid` also return `needs_attention boolean` (true when the booking was not `pending`/`expired`/`paid`), and when it's true send the owner an alert "Payment received for a cancelled booking TN-XXXXXX — refund or reinstate it" via `notifyOwner` (template in `src/lib/email/templates.ts`, escaped). PGlite test for the new flag. Use `create or replace` in a new migration `0006_payment_fixes.sql` (drop and recreate if the return type changes; keep security definer, `search_path = ''` and the service_role-only grant).

## 4. Bookings must not silently disappear before Stripe is set up
Without Stripe, a reservation stays `pending`, `expire_holds` expires it after 30 minutes, and the owner is never told (emails only go out for `paid`). Fix:
- When Stripe is **not** configured, `reserveBooking` sends the owner alert immediately with the subject prefix **"PAYMENT NEEDED"** and the customer a "we've received your booking request, we'll contact you to arrange payment" email (new template), recording the `*_sent_at` columns as usual.
- Add `bookings.payment_method text not null default 'stripe' check in ('stripe','manual')`. `reserve_booking` gets a new optional last parameter `p_manual_payment boolean default false`; when true it stores `payment_method = 'manual'` and `hold_expires_at = null`, and seat counting treats a `pending` booking with `payment_method = 'manual'` as holding its seats (update `departure_seats_taken`, the `departure_availability` view and `mark_booking_paid`'s seat count consistently). `expire_holds` never touches manual bookings.
- The admin booking detail page gets a **"Mark as paid"** button for manual pending bookings (RLS: admin session, not the service role).
- PGlite tests: a manual booking keeps its seats after 30 minutes and isn't expired; a stripe booking still expires.

## 5. Qualify pgcrypto
In `0006`, change the `access_token` default to `encode(extensions.gen_random_bytes(24), 'hex')` (Supabase installs pgcrypto in the `extensions` schema). Update the PGlite stub to create the function in an `extensions` schema instead of `public`.

## Acceptance criteria
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass with no `.env`
- No secrets in `dist/_astro`; homepage 0 scripts; tour page JS ≤ 15 KB gzipped
- No `any`, `as never`, `@ts-ignore` or disabled lint rules; no real network calls in tests
- Only stop processes you started, by PID. Don't touch git.
