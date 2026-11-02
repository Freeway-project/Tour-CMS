# Task 09 — Redesign for decision speed: "no surprises" home and tour pages

Read `AGENTS.md` first and follow it. Builds on tasks 03–08. Competitor research (Nov 2026):
most Toronto→Niagara operators now book online, so instant booking alone is not the pitch. What
competitors rarely show **together** is: the total price including HST, the exact group limit, the
real guide and vehicle, a timed day, and live dates without leaving the page. The redesign puts
those answers at the top and cuts everything else. Calm, current, consistent.

## Facts (all from data, never literals — rule 11)
- **All-in price:** `fromPrice` × 1.13 rounded to the cent, labelled "including HST". Use the
  existing money/HST helpers; add one `fromPriceInclHst()` with tests. Never show a pre-tax price
  as the headline.
- **Group limit:** `tours.max_guests` for a shared tour ("Max 11 guests"; anon cannot read
  `schedules`, so 0009 copies the highest active schedule capacity into it and the owner edits it
  in admin); for a private tour, the largest active `max_pax`. Pure helper with tests.
- **Inclusions** come from the packages; **exclusions** and the **timed itinerary** are new
  (§1). Never claim the boat cruise or any attraction is included unless the data says so.
- **Ratings:** only the task 07 rule (real platform, count > 0), labelled with the platform name
  ("4.9 on Google, 186 reviews"). Never a blended number.

## 1. Migration `0009_tour_story.sql`
- `tours.itinerary jsonb not null default '[]'` — array of `{ "time": "08:00", "title": text,
  "detail": text|null }`, check `jsonb_typeof = 'array'`.
- `tours.excludes text[] not null default '{}'`.
- `tours.max_guests integer null check > 0`.
- `site_settings`: `guide_name`, `guide_bio`, `vehicle_text` (text, default `''`) and
  `guide_photo`, `vehicle_photo` (jsonb `{ path, width, height, alt }` or null; the size is stored
  so images never shift).
- Seed/fixtures: `TODO:` placeholders only; do not invent an itinerary, a guide or a vehicle.
- Add to `MIGRATIONS`; PGlite tests for defaults and anon read-only.

## 2. Admin
- Tour edit page: the itinerary as one textarea, one stop per line
  (`08:00 | What happens | optional detail`; add, remove and reorder by editing lines; each bad
  line is reported by number), a "Not included" list and "Maximum guests".
- Settings: guide name, guide bio (markdown), guide photo, vehicle description, vehicle photo.
  Photo upload reuses the tour image upload path (same bucket, `site/` prefix, same size and type
  checks). Validate with zod in `admin-schemas.ts`, with tests.

## 3. Photos on the public site
- Tour hero = the tour's `is_hero` image from `tour_images`, else none. Load `tour_images` in the
  catalogue query (ordered by `sort_order`), map in `src/lib/db/`.
- Render with `astro:assets` `<Image>`/`<Picture>` (AVIF + WebP, `widths`/`sizes`, explicit
  width/height from the row, `fetchpriority="high"` + eager on the one hero, lazy elsewhere).
- **No photo yet → no broken image.** The hero must look finished without a photo (solid brand
  panel, the facts carry it). Never reference `/images/placeholder-*`.
- Tour page gallery: the other images as a horizontally scrollable row with CSS scroll-snap,
  **no JS, no autoplay**; omit when there are none.

## 4. Home page (order)
1. **Static hero** (no carousel): photo of the first visible tour if any; H1 "Small-group Niagara
   Falls tours from Toronto" style headline built from data where possible; one fact line
   (`Max N guests` · duration · pickup area · free cancellation only if the cancellation policy is
   real); price "From $X per adult, including HST"; one primary "Check dates" → first shared tour
   `#book`. Hero text, price and CTA visible at 375×812 and 1280×800 without scrolling.
2. **Two choices**: one card per visible tour — photo (if any), title, all-in from-price with unit,
   group limit, duration, pickup, top 3 inclusions, one link. Below the cards a 4-row comparison
   (price incl. HST, group size, vehicle/pickup, best for) only when there are 2+ tours.
3. **Trust strip**: only literally true facts from data (max guests, pickup, free cancellation
   when the policy is real, instant confirmation when online booking is on). 3–4 items, no icons
   as emoji.
4. **The day at a glance**: from the first shared tour's itinerary (3–5 moments with times).
   Omit while empty.
5. **Reviews** (task 07 rules), **Meet your guide / your vehicle** (only when not placeholders),
   **short FAQ** (max 8), footer.

## 5. Tour page (order)
Hero (photo or brand panel, H1, short description, quick-facts row: duration, max guests, pickup
time, language if in data) → **booking widget** (unchanged logic) → gallery → timed itinerary
(ordered list with times) → included / not included (two lists) → pickup list → guide & vehicle →
reviews → FAQ (max 8) → footer. Keep the mobile sticky bar: **one price (incl. HST) and one
action**. Remove repeated or competing CTAs.

## 6. Look
Stay in the existing tokens (`--color-brand`, `--color-ink`, `--color-bg`, system font) and
Tailwind. Larger, confident type for H1/price; generous spacing; at most one card style and one
button style; no promo bars, no logo walls, no emoji, no gradients, no "eyebrow" labels in
tracked capitals. Focus-visible on every link/button, AA contrast, `prefers-reduced-motion`
respected (there should be almost no motion anyway).

## Notes from the build (orchestrator)
- Uploads are now checked on the server too (`src/lib/upload.ts`: JPEG/PNG/WebP/AVIF, ≤ 5 MB,
  sane dimensions), for tour photos and the new guide/vehicle photos.
- `sharp` is a direct devDependency (same version as the lockfile): Astro's `compile` image
  service loads it from the project root during `astro build`, and pnpm only linked it inside
  Astro's own folder.
- Sample photos: five CC0 Wikimedia Commons photos uploaded to `tour-images/samples/` for the
  demo; the owner replaces or deletes them in admin.

## Acceptance criteria
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass with no `.env`.
  `pnpm` is not on PATH on this machine: run it as `npx -y pnpm@9.15.9 <script>`.
- Home ships **0** `<script>` tags; tour page JS ≤ 15 KB gzipped; CLS-safe images (dimensions set).
- `grep -ri "todo" dist/` finds nothing in public HTML; no `/images/placeholder` in public HTML.
- Hero H1, price and primary CTA visible without scrolling at 375×812 and 1280×800.
- One `<h1>` per page, headings in order, descriptive link text.
- No new dependencies. No `any`, `as never`, `@ts-ignore` or disabled lint rules.
- Tests use PGlite; do not touch the real Supabase project (the orchestrator applies 0009).
- Dev server on port 4321 (tmux `tour-dev`) must keep running; don't touch git.
