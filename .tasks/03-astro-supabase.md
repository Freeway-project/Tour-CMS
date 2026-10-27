# Task 03 — Single Astro app on Cloudflare + Supabase schema

Read `AGENTS.md` first and follow it. **The stack has changed:** we are dropping Sanity and the monorepo. The final layout is one Astro app at the repo root plus a `supabase/` folder.

## Step 1 — Flatten the repo
- Move `apps/web` to the repo root (`src/`, `public/`, `astro.config.mjs`, `tsconfig.json`). Merge its `package.json` into the root one (name `tour-cms`).
- Move `packages/ui/src/Button.astro` to `src/components/Button.astro` and `packages/ui/src/tokens.css` into `src/styles/`. Add `focus-visible` outline styles to the Button.
- **Delete** `apps/`, `packages/`, `pnpm-workspace.yaml`, all Sanity dependencies, the `pnpm.overrides` for `@sanity/types`, and every Sanity reference in README.
- Keep the ESLint flat config, Prettier, `tsconfig` strictness and the CI workflow. Update CI to run `pnpm test` too.
- Keep `apps/web/src/data/fixtures.ts` content but move it to `src/data/fixtures.ts` and retype it with the new types from Step 4 (no Sanity fields such as `_id`/`_type`/portable text: use plain strings/markdown).
- `site` in astro.config: `https://torontoniagara.ca`.

## Step 2 — Cloudflare adapter
- Add `@astrojs/cloudflare`. Keep `output: 'static'` (pages prerender by default; server routes opt out per route).
- Add `wrangler.jsonc` with name `torontoniagara`, `compatibility_date` of today, `compatibility_flags: ["nodejs_compat"]`, and `pages_build_output_dir: "./dist"`.
- Add one server route `src/pages/api/health.ts` with `export const prerender = false` that returns `{ ok: true }` JSON. This proves server routes work.
- Env via `astro:env` schema in `astro.config.mjs`:
  - `PUBLIC_SUPABASE_URL` (client, public, optional)
  - `PUBLIC_SUPABASE_ANON_KEY` (client, public, optional)
  - `SUPABASE_SERVICE_ROLE_KEY` (server, secret, optional)
- Update `.env.example`.

## Step 3 — Content collections (`src/content.config.ts`)
Use the Astro 5 content layer (`glob`/`file` loaders) with zod schemas:
- `faqs`: one JSON file `src/content/faqs.json`, items `{ id, question, answer (markdown string), tags: string[] }`. Seed 8 realistic FAQs (weather, boat season May–Nov, passports not needed, kids, accessibility, cancellation 24 h, what to bring, pickup).
- `reviews`: `src/content/reviews.json`, items `{ id, author, location?, rating 1–5 int, text, date, source: google|tripadvisor|viator|direct, featured }`. Move the 8 fixture reviews here.
- `site`: `src/content/site.json` single entry: `{ name, tagline, phone, whatsapp, email, address, hstNumber?, cancellationPolicy, announcement: { enabled, text, href? }, ratings: [{ platform, score, count, url }] }`. Use placeholder values clearly marked "TODO".

## Step 4 — Supabase schema (`supabase/migrations/0001_init.sql`)
Write plain Postgres SQL compatible with Supabase. All money columns are `integer` cents; all timestamps `timestamptz`.

Tables:
- `tours`: id uuid pk default gen_random_uuid(), slug text unique not null, title, short_description, description (markdown), duration_minutes int, hero_image_path text, status text check in ('active','seasonal','hidden') default 'active', is_private bool default false, sort_order int default 0, created_at, updated_at
- `packages`: id, tour_id fk → tours on delete cascade, name (e.g. "Bus only", "+ Boat cruise"), description, includes text[], price_adult_cents int not null, price_child_cents int, price_senior_cents int, is_active bool default true, sort_order int
- `addons`: id, tour_id fk cascade, name, description, price_cents int not null, pricing text check in ('per_person','per_booking'), is_active bool, sort_order
- `pickup_locations`: id, name, address, lat double precision, lng double precision, pickup_note text, is_active bool
- `tour_pickups`: tour_id, pickup_location_id, pickup_time time, primary key (tour_id, pickup_location_id)
- `departures`: id, tour_id fk cascade, starts_at timestamptz not null, capacity int not null check > 0, status text check in ('open','closed','cancelled') default 'open', unique (tour_id, starts_at)
- `bookings`: id, reference text unique not null (short human code, e.g. `TN-7K3F9Q`, generated in SQL), departure_id fk, package_id fk, pickup_location_id fk null, adults int ≥0, children int ≥0, seniors int ≥0, (check adults+children+seniors > 0), addons jsonb not null default '[]' (array of `{addon_id, name, quantity, unit_cents}` snapshotted at booking time), subtotal_cents, tax_cents, total_cents, currency text default 'CAD', status text check in ('pending','paid','cancelled','expired','refunded') default 'pending', hold_expires_at timestamptz, customer_name, customer_email, customer_phone, notes, stripe_checkout_session_id text unique null, created_at, updated_at
- `inquiries` (private-tour requests): id, tour_id null, preferred_date date, group_size int, customer_name, customer_email, customer_phone, message, status text check in ('new','contacted','closed') default 'new', created_at
- `admins`: user_id uuid pk references auth.users on delete cascade

Also:
- `updated_at` trigger on tours and bookings.
- View `departure_availability` (`security_invoker = true`): departure id, tour_id, starts_at, capacity, status, `seats_taken` = sum of pax for bookings with status `paid`, or `pending` with `hold_expires_at > now()`, and `seats_left`.
- Function `public.is_admin()` returns boolean (exists in admins for `auth.uid()`), `security definer`, `set search_path = ''`.
- Function `public.reserve_booking(p_departure_id uuid, p_package_id uuid, p_adults int, p_children int, p_seniors int, p_addons jsonb, p_pickup_location_id uuid, p_customer_name text, p_customer_email text, p_customer_phone text, p_notes text)` returns table(booking_id uuid, reference text, total_cents int, hold_expires_at timestamptz):
  - `security definer`, `set search_path = ''`, fully schema-qualified names
  - locks the departure row `FOR UPDATE`; raises a clear exception if the departure isn't open, is in the past, or the package doesn't belong to the departure's tour, or is inactive
  - counts seats taken exactly like the view; raises `'not_enough_seats'` if the request exceeds seats left
  - computes prices **from the DB** (never from arguments): pax × package prices (child/senior fall back to adult price when null) plus add-ons (`p_addons` is `[{addon_id, quantity}]`; per_person add-ons use quantity, per_booking ones count once; add-ons must belong to the same tour and be active)
  - HST = round(subtotal × 0.13), total = subtotal + tax
  - inserts a `pending` booking with `hold_expires_at = now() + interval '15 minutes'`
  - `revoke execute ... from public, anon, authenticated`; `grant execute ... to service_role`
- RLS enabled on **every** table. Policies:
  - anon + authenticated: `select` on tours (status <> 'hidden'), packages (is_active), addons (is_active), pickup_locations (is_active), tour_pickups, departures (status = 'open' and starts_at > now())
  - grant `select` on `departure_availability` to anon, authenticated
  - admins (`public.is_admin()`): full access to every table
  - no anon/authenticated access at all to bookings, inquiries or admins (except admins)
- `supabase/seed.sql`: insert the 3 fixture tours with packages (Niagara day tour: "Bus only" $99, "+ Boat cruise" $159, "+ Boat & Journey Behind the Falls" $209 adult; children ~20% less), a few add-ons (lunch per_person, airport drop-off per_booking), the 4 pickup locations, and departures for the next 30 days at 08:00 Toronto time with capacity 7.

## Step 5 — Test the SQL locally with PGlite
No Docker. Add devDependency `@electric-sql/pglite` and a vitest test `supabase/tests/schema.test.ts` that:
1. Creates a stub of what Supabase provides before running the migration: roles `anon`, `authenticated`, `service_role` (`CREATE ROLE ... NOLOGIN` if not exists), schema `auth` with table `auth.users (id uuid primary key)` and function `auth.uid()` returning null::uuid. Keep this stub in `supabase/tests/supabase-stub.sql`.
2. Runs `0001_init.sql` then `seed.sql`.
3. Asserts: `reserve_booking` returns the right total for 2 adults + 1 child on "+ Boat cruise" with one lunch add-on (compute expected value in the test from the seed numbers, including 13% HST); a second call that would exceed capacity 7 raises `not_enough_seats`; `departure_availability.seats_left` decreases after a booking; an expired hold (update `hold_expires_at` to the past) frees the seats again; a booking for a package from another tour is rejected.

## Step 6 — TypeScript data layer (`src/lib/`)
- `src/lib/types.ts`: domain types `Tour` (with `packages`, `addons`, `pickups`), `Package`, `Addon`, `PickupLocation`, `Departure` (with `seatsLeft`), `BookingQuote`, plus `Review`, `Faq`, `SiteSettings` inferred from the content collection schemas.
- `src/lib/pricing.ts`: pure `quote({ pkg, addons, adults, children, seniors })` → `{ subtotalCents, taxCents, totalCents, lines }` using exactly the same rules as the SQL. Add `src/lib/pricing.test.ts` with vitest, including the same 2 adults + 1 child + lunch case so TS and SQL are proven to agree.
- `src/lib/format.ts`: `formatCad(cents)` with `Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' })`.
- `src/lib/db/client.ts`: creates a Supabase client (`@supabase/supabase-js`) from the public env vars. Export `hasSupabase` boolean.
- `src/lib/db/catalog.ts`: `getTours()`, `getTourBySlug(slug)`, `getDepartures(tourId, from, to)`. **When `hasSupabase` is false, return data from `src/data/fixtures.ts`** so the site builds with no `.env`. Map snake_case rows to the camelCase types.

## Step 7 — Keep the homepage working
`src/pages/index.astro` keeps the current placeholder, but reads the site name from the `site` collection and the lowest "from" price from `getTours()` (formatted with `formatCad`). It must still ship 0 KB JS.

## Scripts in package.json
`dev`, `build` (`astro check && astro build` is fine, or keep `typecheck` separate), `preview` (`wrangler pages dev ./dist`), `lint`, `typecheck` (`astro check`), `test` (`vitest run`), `format`, `format:check`.

## Acceptance criteria
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` all exit 0 with **no `.env` file**
- No `apps/`, `packages/` or Sanity left anywhere (`grep -ri sanity` finds nothing outside the lockfile history)
- `dist/index.html` ships 0 `<script>` tags. `dist/` contains the Cloudflare worker output for `/api/health`.
- SQL tests cover all five assertions in Step 5 and pass
- No `any`, no `@ts-ignore`, no disabled lint rules

## Do NOT
- build booking UI, Stripe, email or `/admin` (later tasks)
- create a real Supabase project or call the network in tests
- touch git
