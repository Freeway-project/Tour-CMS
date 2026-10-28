# Task 04a — Real tour data from the client + private-vehicle pricing

Read `AGENTS.md` first and follow it. Builds on task 03. Do this **before** task 04.

The client sent their real offer. Replace all sample tours (the evening fireworks tour, the wine tour, the boat-cruise packages, the lunch and airport add-ons, the four sample pickups) with the data below, everywhere they appear: `supabase/seed.sql`, `src/data/fixtures.ts`, and any test that depends on them.

## The client's offer (winter season)

**1. Niagara Falls Day Tour from Toronto** (slug `niagara-falls-day-tour`, shared group tour, `is_private = false`)
- One package: "Day tour", **$99 per person** (`price_adult_cents = 9900`). Child and senior prices `null` (they fall back to the adult price).
- Includes (`includes` array, in this order):
  1. Free Canadian maple syrup tasting
  2. Floral Clock
  3. Whirlpool Rapids
  4. Niagara Parks Power Station (historic hydro power station)
  5. Sightseeing along the Niagara Parkway
  6. Stops at beautiful spots for photos
- Attraction tickets are **not** included. Copy to use in the description: "Want to add an attraction such as the boat cruise or Journey Behind the Falls? Buy it on the day. We'll help you get your tickets."
- `duration_minutes` 600 with a `-- TODO confirm with client` comment. Departures: next 30 days at 08:00 Toronto time, capacity 11 (`-- TODO confirm`).

**2. Private Niagara Falls Tour** (slug `private-niagara-falls-tour`, `is_private = true`)
- Same stops and inclusions as the day tour, but private: the group has the vehicle to itself and can set its own pace.
- Priced **per vehicle**, not per person:
  - "Sprinter van, up to 6 people": **$699 per vehicle** (`69900`), max 6
  - "Mercedes-Benz Sprinter, up to 11 people": **$999 per vehicle** (`99900`), max 11
- Same attraction note as above.
- No departures (private tours are requested through the inquiry form).

**Pickup** (the only pickup location for both tours): name "55 York St, downtown Toronto", address "55 York St, Toronto, ON M5J 1R7", lat 43.6455, lng -79.3825. Pickup time 07:45 for the day tour (`-- TODO confirm`).

No add-ons for now (keep the `addons` table, insert nothing).

Write the descriptions in plain, friendly en-CA English. Don't invent facts beyond what's listed (no lunch, no guide names, no hotel pickup).

## Schema change — `supabase/migrations/0002_group_pricing.sql`
Do **not** edit `0001_init.sql`; add a new migration.
- `packages`: add `pricing_mode text not null default 'per_person' check (pricing_mode in ('per_person','per_group'))` and `max_pax int null check (max_pax is null or max_pax > 0)`. Add a check that `per_group` packages have `max_pax` set. For `per_group`, `price_adult_cents` is the flat price for the whole group.
- `inquiries`: add `package_id uuid null references public.packages(id) on delete set null` so the customer can say which vehicle they want.
- `reserve_booking`: `create or replace` it (same signature, same security settings and grants) so it raises `'private_tour_inquiry_only'` when the package is `per_group`. Everything else stays the same.

## TypeScript
- `src/lib/types.ts`: `Package` gets `pricingMode: 'per_person' | 'per_group'` and `maxPax: number | null`. Map them in `src/lib/db/catalog.ts`.
- `src/lib/pricing.ts`: `quote()` handles `per_group`: one line "<package name> (up to N people)" at the flat price, plus HST. Throw if the number of people exceeds `maxPax`.
- Add a pure `fromPrice(tour)` helper in `src/lib/pricing.ts` returning `{ cents, unit: 'person' | 'vehicle' }` (the lowest per-person package price if any, otherwise the lowest per-group price). Use it on the homepage instead of the current computation. Display: "From $99 per person" / "From $699 per vehicle".

## Tests
- `supabase/tests/schema.test.ts`: run both migrations then the seed. Rewrite the cases against the new seed. Where a case needs an add-on, a child price or a second tour, **insert that test data inside the test itself**, don't put it back in the seed. Keep all five original assertions, and add:
  - `reserve_booking` on a private `per_group` package raises `private_tour_inquiry_only`
  - inserting a `per_group` package without `max_pax` fails
- `src/lib/pricing.test.ts`: add per-group cases (6 people on the $699 van = 69900 + 9087 HST = 78987; 7 people on it throws) and `fromPrice` cases for both tours.

## Acceptance criteria
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass with no `.env`
- `grep -ri "fireworks\|winery\|hornblower\|lunch" src supabase` finds nothing
- Homepage still ships 0 `<script>` tags and shows "From $99 per person"
- No `any`, no `@ts-ignore`, no disabled lint rules

## Do NOT
- build the tour page or booking widget (task 04)
- edit `0001_init.sql`
- touch git
