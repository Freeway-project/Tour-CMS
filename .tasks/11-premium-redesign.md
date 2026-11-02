# Task 11 — Premium redesign: "The Niagara Experience: Beautifully Simple"

Read `AGENTS.md` first and follow it. Builds on task 10 (same data rules: everything a visitor
reads comes from data, placeholders stay hidden, no invented facts). Goal: a premium Canadian
tour operator, not a template. Booking logic and admin pages are unchanged.

## 1. Tokens (`src/styles/global.css`, `src/styles/tokens.css` only)
- Colours: `brand` Evergreen #143E3A (header, headings, primary buttons), `brand-deep`
  #0E2B28 (footer), `teal` Niagara Teal #127B83 (accents, links, active states), `teal-ink`
  #0F6A71, `bg` Warm Ivory #F8F7F2, `ink` Charcoal #24343A, `mist` #EAF3F2 (section bands),
  `accent` Champagne #C58B4A (sparing highlights), `accent-ink` #8A5A22. White for cards and
  the booking panel. Task 10's `sand` is gone.
- Contrast (documented in the stylesheet): brand on bg 11.0:1, white on brand 11.8:1, white on
  brand-deep 15.1:1, ink on bg 12.0:1, teal on bg 4.7:1 and on white 5.0:1. Teal on mist is
  4.4:1, so small text on mist uses `teal-ink` (5.6:1). Champagne on bg is 2.7:1, so it is used
  for decoration only (rules, icons, stars with an `accent-ink` outline). As text it appears
  only as `accent-ink` on light (5.5:1).
- Fonts: Manrope (headings) and Inter (body) from `@fontsource-variable/manrope` and
  `@fontsource-variable/inter`. Latin subset only: `Site.astro` writes the two `@font-face`
  rules (`font-display: swap`) and preloads the two latin variable files (both are above the
  fold). Fraunces is removed.
- Type: `.heading-hero` 38→60px, weight 700, tracking −0.025em; `.heading-section` 30→40px;
  `.heading-card` 24→26px; body 16px (17px from `lg`), line-height 1.6.
- Layout: `.container-site` (1200px max), `.section-pad` (64px mobile, 104px desktop).
- Shapes: `rounded-card` 18px, `rounded-btn` 12px, `rounded-input` 10px, 1px `ink/10`
  borders, restrained `shadow-raised` / `shadow-lift`. `.btn-primary` and `.link` are the one
  button style and the one link style.

## 2. Hero (`HeroBanner.astro`)
- **Slideshow is on by default** (owner's request overrides the brief's static hero): the
  crossfade from task 10, 6 s per photo, 1.5 s fade, pure CSS, no Ken Burns. The switch is one
  line: `HERO_SLIDESHOW` in `src/lib/ui-settings.ts` (`false` = static tour hero image). Pages
  pass it as the `slideshow` prop.
- Photos: home = the main tour's hero image, then the other tours' photos (`slideshowPhotos`);
  tour page = that tour's photos, hero first. The first photo is eager with
  `fetchpriority="high"`, the rest lazy. Reduced motion: first photo only, no indicators.
- Height 570–680px on mobile and 650–760px on desktop (`clamp` with `100svh`). The hero sits
  under the transparent header (`-mt-18`).
- Content: label "Discover Niagara Falls" (tracked caps, white text, champagne rule), H1 from
  data, subheading from data (3 lines max on mobile), "From $X per adult, including HST", ONE
  white CTA "Check dates & availability" → `/tours/<slug>/#book` ("Request your date" for a
  private tour), then quiet trust details (guests, duration, free cancellation only when the
  policy is real).
- Scrims: a top fade for the header, then a deep evergreen fade from the bottom on mobile and
  from the left on desktop. Thin champagne slide indicators; captions from alt text on `lg`.

## 3. Header and footer
- Header (`SiteHeader.astro`): logo on the left, anchor links to the home sections (Tours,
  Experience, Pickup, Reviews, FAQ). A link shows only when its section renders:
  `homeSections()` + `homeNav()` in `src/lib/home-nav.ts`, shared by the home page and the
  header (tested). Policy pages and 404 get "Tours" only.
- With `overlayHeader` (home and tour pages) the header starts transparent and turns solid
  evergreen over the first 160px of scroll. Pure CSS (`animation-timeline: scroll(root)`).
  Browsers without it get the solid header.
- Mobile drawer: a `<details>` element, so it works without JS, with focus styles. One tiny
  inline script (270 bytes gzipped) closes it after a link tap or on Escape. It is the only
  script on the home page.
- Footer: deep evergreen; logo and tagline, tour links, contact (only real values), pickup
  points (`pickupPoints()`, anchor `#pickup`), © year, policy links. No socials:
  `site_settings` has no social fields.

## 4. Home (order)
1. Hero. 2. Trust strip (up to 4 true claims, line icons, 2 columns on mobile).
3. "Two ways to experience Niagara" (title only when there are exactly 2 tours) + "Choose the
   experience that fits your travel style.": premium cards (16:10 photo, hover zoom, lift,
   duration / group / pickup, 4 inclusions, all-in price, one action). Then "Compare at a
   glance": a table on `md+`, one stacked list per tour on mobile. A boat-cruise row appears
   only if `boatCruiseStatus()` (tested) finds it in package inclusions or exclusions.
4. "How it works": 3 numbered steps. Step 2 says live availability only when a shared tour is
   bookable online; step 3 uses the real pickup fact.
5. "More than just the falls" (`#experience`): asymmetric editorial grid of up to 5 tour photos
   (no holes), captions = alt text, only with 3+ photos. No claims beyond the captions.
6. Guide / vehicle (hidden while placeholders). 7. "Experiences worth sharing" (`#reviews`):
   real reviews, stars, source ("Google review") and date, no counts. 8. FAQ (`#faq`), 6
   questions, smooth `<details>` accordion where supported.

## 5. Tour page
- Hero → `main` grid, 65 / 35 on `lg`. Left: About (description) + quick-facts row (duration,
  group, departs from, free cancellation only if real) → photo grid → "Your day, beautifully
  planned" (vertical timeline, numbered stops, connecting line, times from data; hidden while
  empty) → included / not included (check and minus icons) → prices incl. HST → pickup
  (`#tour-pickup`) → guide and vehicle → reviews (even number, 2 per row) → FAQ (6).
- Right: the booking widget in a white sticky card (`lg:sticky`, scrolls inside if taller than
  the screen); first on mobile, right under the hero.
- Booking widget and inquiry form restyled **with classes only**: card, package and date
  radios (teal border, mist fill, bold when checked, faded when disabled), the date list in
  its own scroll box (24rem), steppers, inputs (10px, teal focus ring), price summary on mist
  with an evergreen total, evergreen submit button. Container queries (`@container` on the
  aside) replace `sm:` grids so the narrow sidebar stacks. No logic changes.
- Mobile bottom bar: price + "Check dates" → `#book`, `env(safe-area-inset-bottom)`. It is
  hidden while `#book` is in view with a pure-CSS view timeline (`timeline-scope` on the page
  wrapper). Browsers without support keep it visible. No second booking state.

## 6. Motion
150–200 ms hovers, card lift, image zoom on hover, accordion transition, scroll-linked header.
No parallax, no popups. Everything respects `prefers-reduced-motion`.

## Checks (done)
- `lint`, `typecheck`, `test` (206 tests) pass; build without `.env` passes.
- No horizontal overflow at 360/390/768/1024/1440 (`scrollWidth == clientWidth`, home and both
  tour pages).
- Built home: 1 `<script>` (the drawer closer above). Tour JS: booking widget 3.4 KB + shared
  pricing 4.2 KB gzipped. One `<h1>` per page; no "todo" or `/images/placeholder`.
