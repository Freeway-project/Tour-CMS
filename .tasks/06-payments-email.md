# Task 06 — Stripe payment, booking emails, private confirmation links

Read `AGENTS.md` first. Builds on tasks 03–05b. All prices stay server-computed in cents; Stripe gets the total from the booking row, never from the browser.

## 1. Migration `0005_payments.sql`
- `reserve_booking` (`create or replace`, same signature, security and grants):
  - hold becomes **30 minutes** (Stripe Checkout's minimum expiry);
  - per-person add-on quantity is capped at the number of people (raise `invalid_addons` if higher);
  - duplicate `addon_id`s in `p_addons` raise `invalid_addons`.
- `bookings`: add `access_token text not null default encode(gen_random_bytes(24), 'hex')` (unique), `paid_at timestamptz`, `confirmation_email_sent_at timestamptz`, `owner_email_sent_at timestamptz`. `reserve_booking` also returns `access_token`.
- `public.mark_booking_paid(p_session_id text, p_booking_id uuid)` (security definer, service_role only): sets `status = 'paid'`, `paid_at = now()`, `stripe_checkout_session_id` **only if** the booking is `pending`. Returns whether it changed something (idempotent: a second call returns false). If the hold had already expired but the seats are still free, still mark it paid; if the seats were taken by someone else meanwhile, set status `'paid'` anyway and return a flag `overbooked = true` so the owner is alerted (never silently lose a payment).
- `public.expire_holds()` (service_role only): pending bookings past `hold_expires_at` → `expired`. Called by the existing daily cron **and** every 15 minutes (add cron `*/15 * * * *`; the scheduled handler checks `event.cron` to decide which job to run).
- PGlite tests for all of the above (30 min hold, add-on cap, duplicate add-ons, idempotent mark paid, overbooked flag, expire_holds).

## 2. Stripe Checkout (no Stripe JS on our pages)
- Dependency: `stripe` (server only). Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (server, secret, optional). Update `.env.example`.
- `reserveBooking` action: after `reserve_booking`, create a Checkout Session (mode `payment`, currency `cad`, one line item per quote line with the DB amounts **including a separate "HST 13%" line**, `customer_email`, `client_reference_id` = booking id, `metadata.booking_id`, `expires_at` = the booking's `hold_expires_at`, `success_url` = `/booking/confirmed?ref={reference}&t={access_token}`, `cancel_url` = the tour page `#book`). Save the session id on the booking. Return the Checkout URL; the widget and the no-JS route redirect there.
- Use `Stripe.createFetchHttpClient()` so it runs on Cloudflare Workers.
- When Stripe isn't configured: keep today's behaviour (pending booking → confirmation page that says "We'll contact you to arrange payment"), so the site works before the owner has a Stripe account.
- `src/pages/api/stripe-webhook.ts` (`prerender = false`, POST): verify the signature with `constructEventAsync` and `Stripe.createSubtleCryptoProvider()` on the **raw body**; handle `checkout.session.completed` (→ `mark_booking_paid`, then send emails) and `checkout.session.expired` (→ booking `expired` if still pending). Always return 200 quickly for handled/ignored events, 400 on bad signature. Exclude this route from Astro's `checkOrigin` (Stripe has no Origin header) **without** disabling it for the rest of the site — check how `checkOrigin` applies to non-form content types and document the result in a comment.

## 3. Private confirmation link
- `/booking/confirmed` requires both `ref` and `t` (access token) and compares the token in constant time. Wrong or missing token → the same friendly "not found" as an unknown ref. Shows status: paid ("You're booked!"), pending ("Payment not finished" + a "Complete payment" button that creates a new Checkout Session if the hold is still valid), expired ("This reservation expired").

## 4. Email (free tier, no SDK)
- Provider: **Resend** HTTP API via `fetch` (`RESEND_API_KEY`, `EMAIL_FROM`, both server/secret/optional). `src/lib/email/send.ts` with a tiny provider interface so it can be swapped later. No key → log and skip, never fail the booking.
- Templates in `src/lib/email/templates.ts` as plain functions returning `{ subject, html, text }`; inline CSS, mobile friendly, all business details (name, phone, WhatsApp, address) from `site_settings`, never hard-coded:
  1. Customer booking confirmation (reference, tour, date/time Toronto, people, pickup + time, total with HST, private link, cancellation policy, contact).
  2. Owner new-booking alert (to `site_settings.email`): who, when, how many, pickup, phone with `tel:` and WhatsApp links, total, link to `/admin/bookings/<id>`. Marked **OVERBOOKED** in the subject if the flag is set.
  3. Owner new private-tour request alert (from `createInquiry`).
  4. Customer "we got your request" for private tours.
- Record `confirmation_email_sent_at` / `owner_email_sent_at` so a webhook retry doesn't send twice. Escape every customer-supplied value in HTML.
- Tests: templates escape HTML, include the reference and total, and use settings values; the send helper skips cleanly without a key (mock `fetch`).

## 5. WhatsApp later
Put owner notifications behind `src/lib/notify.ts` (`notifyOwner(event)`) that currently sends email only, so WhatsApp can be added as a second channel later without touching callers.

## Acceptance criteria
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass with no `.env`
- No Stripe or email secrets in client bundles (`grep -r "STRIPE\|RESEND" dist/_astro` finds nothing); homepage 0 scripts; tour page JS ≤ 15 KB gzipped
- No `any`, `as never`, `@ts-ignore` or disabled lint rules
- No real network calls in tests
- Only stop processes you started, by PID. Don't touch git.
