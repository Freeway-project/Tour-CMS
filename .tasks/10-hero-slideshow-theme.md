# Task 10 — Hero slideshow and a theme with character

Read `AGENTS.md` first and follow it. Builds on task 09 (data rules unchanged: everything a
visitor reads comes from data; placeholders stay hidden). The owner asked for "some hero banner
images changing, and a little more UI change. The theme is very bland." This task replaces the
static hero with a CSS-only slideshow and gives the public site a real visual identity.
Booking logic (`src/components/booking/*`) and admin pages are unchanged.

## 1. Hero slideshow (`HeroBanner.astro`)
- Prop `photos: Photo[]` (was `photo`). Max 6 (`MAX_SLIDES` in `src/lib/photos.ts`).
- **Photos come from data** via the pure helper `slideshowPhotos(imageSets)` (tests in
  `photos.test.ts`): each tour's `isHero` image first (tour order), then the other images by
  `sortOrder`. Duplicates are dropped by `src`, and by identical non-empty alt text (the same
  sample photo is uploaded to both tours under two storage paths).
  - Home: all visible tours. Tour page: that tour only.
- **Pure CSS, no JS.** Each slide runs the same keyframes with a staggered `animation-delay`:
  6 s per photo, 1.5 s crossfade, slow 8 % Ken Burns zoom. One keyframe set per photo count
  (2–6) in the component's `<style>`, so the home page still ships 0 `<script>` tags.
- One photo: static. No photo: solid brand panel (teal gradient), facts carry it.
- Only the first photo is `priority` (eager, `fetchpriority="high"`); the rest are lazy. All
  have width/height from the row.
- `prefers-reduced-motion: reduce`: first photo only, no animation, no indicators.
- Readability: overall ink tint, a strong brand-deep fade from the bottom (where the text
  sits) and from the left on `sm+`. Facts sit in translucent pills.
- Non-interactive slide indicators (amber bar for the current photo) and, on `sm+`, a caption
  from the alt text; both `aria-hidden` (the `<img alt>` already carries it).
- `bottomBar` prop (tour page): extra bottom padding below `lg` so the fixed mobile bar never
  covers the hero price or button.
- Mobile: lead clamped to 3 lines (full text is in "About this tour"); price sits next to the
  button. H1, price, facts and button visible at 375×812 and 1280×800.

## 2. Theme
- Tokens in `src/styles/global.css` `@theme` (no hex in components):
  `brand` #0f5560 (river teal), `brand-deep` #0a3239, `accent` #f4b740 (amber, price and
  primary action), `accent-ink` #9c4a08 (amber for text on light), `ink`, `bg`, `sand`, `mist`,
  `font-display`. Contrast: white on brand 8.4, on brand-deep 13.7; ink on accent 8.7; accent on
  brand-deep 7.6; accent-ink on sand 5.3 (all AA).
- **Display face:** Fraunces (variable, `@fontsource-variable/fraunces`, `wght` axis only,
  `font-display: swap`). The one new dependency. Imported in `Site.astro`; the latin file is
  preloaded (it is the only font above the fold). Body stays on the system stack.
- `.heading-section` component class + `SectionHeading.astro` (short amber rule, display
  heading, optional lead) is the one section heading style.
- `Icon.astro`: small inline line icons (users, clock, pin, check, x, shield, receipt,
  calendar, quote, plus, arrow, mail, phone, falls). Always `aria-hidden`; no emoji anywhere.

## 3. Pages
- **Header:** brand-deep with an amber logo mark and the site name in the display face.
  **Footer:** brand-deep, three columns (contact with icons, tours, policies) and a © line.
  **Announcement bar:** amber.
- **Home (bands alternate):** hero → trust strip (white, icon tiles) → "Choose your tour"
  (sand; cards with image on top, hover zoom, amber price badge, icon facts, inclusion chips,
  whole card clickable) → styled comparison table (zebra rows, row icons, amber prices) →
  "Niagara, up close" photo mosaic (brand-deep, from the same deduplicated tour photos, shown
  only with 3+ photos, grid never has holes) → day at a glance (brand-deep, horizontal timeline
  on `lg`, only when the itinerary has stops) → reviews (mist; quote cards, SVG stars,
  initial avatar) → guide/vehicle (only when real) → FAQ (sand; `<details>` with a rotating
  plus, heading left on `lg`).
- **Tour page:** hero slideshow → booking widget on sand (card restyled with classes only) →
  photo gallery on brand-deep (scroll-snap, captions, no JS) → itinerary, included / not
  included cards with icons, price cards (amber prices), about, pickup cards → guide/vehicle
  (sand) → reviews (mist) → FAQ. Mobile sticky bar is brand-deep with an amber price and button.
- Policy pages and 404: H1 in the display face.

## Checks (done)
- `lint`, `typecheck`, `test` (200 tests) pass; build without `.env` passes.
- Built home: 0 `<script>`; 1 `<h1>` on every page; no "todo" or `/images/placeholder` in HTML.
- Tour page JS unchanged (booking widget only, about 3.3 KB gzipped).
