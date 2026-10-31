# Task 07 — Marketing home page, and no placeholders shown to visitors

Read `AGENTS.md` first and follow it. Builds on tasks 03–06b. The booking engine, tour pages and
admin are done; the home page (`src/pages/index.astro`) is still a single hero whose "Book now"
button links to `#`. Paid-ad traffic lands on it, so it has to sell the tours and send people to
a tour page in one tap.

## 1. Home page
Rebuild `src/pages/index.astro` (keep `prerender = true`). All business data comes from the
existing data layer (`getSiteSettings`, `getTours`, `getReviews`, `getFaqs` in `src/lib/db/`),
never from literals in the page — rule 11. Sections, in this order:

1. **Hero** — the existing heading and description, the cheapest "From $X per person/vehicle"
   line (keep the current `fromPrice` logic), and a primary "See tours & dates" button that
   links to `#tours` (an in-page anchor, no JS). If there is exactly one bookable shared tour,
   a secondary link may go straight to its page. Do not keep `min-h-dvh` vertical centring:
   the hero must not push the tours below the fold at 1280×800 or 375×812.
2. **Tours** (`id="tours"`) — one card per tour from `getTours()`: name, short description,
   duration, the tour's own from-price with its unit (per person / per vehicle), the pickup
   time if known, and one link to `/tours/<slug>/` whose text names the tour
   ("Book the Niagara Falls Day Tour"). The whole card must not be one giant link; one real
   link per card. No images in this task (the real photos are not delivered yet).
3. **Why book with us** — at most 4 short points, built only from facts already in the data
   (inclusions shared by the tours, pickup location, small-group capacity, free maple syrup
   tasting…). If a fact isn't in the data, leave the point out; do not invent claims.
4. **Reviews** — up to 3 reviews from `getReviews()` (author, rating, text, date if present).
   Omit the whole section when there are none.
5. **FAQ** — the site-wide FAQs from `getFaqs()` using native `<details>/<summary>` (no JS).
   Omit when empty.
6. **Footer** — site name, email, and phone/address only when they are real (see §2), plus
   a link to each tour page.

Extract reusable pieces into `src/components/` (e.g. `TourCard.astro`, `FaqList.astro`) when the
tour page could use them, but do not restyle the tour page in this task.

## 2. Never show placeholder values to visitors
The fixtures in `src/data/fixtures.ts` deliberately contain `TODO:` values (phone, address,
HST number, rating platforms, cancellation policy) until the owner fills them in through
`/admin`. They currently leak onto the public site — the tour page shows
"Rated 4.9 on TODO: Google".
- Add a small pure helper in `src/lib/` (e.g. `isPlaceholder(value)`: true for empty strings,
  strings starting with `TODO`, and `example.com` URLs) with unit tests.
- A rating is shown only when it is not a placeholder **and** `count > 0`. Remove the tour
  page's fallback that averages ratings with `count === 0`, and make the JSON-LD
  `aggregateRating` follow the same rule (omit it rather than publish unverified numbers).
- Phone, WhatsApp, address, HST number and cancellation policy are not rendered on public
  pages while they are placeholders. Do **not** edit the fixture values themselves.

## 3. Weekday grouping label
In the booking widget the first date can sit under a heading for the previous week
("Week of Oct 26" above "Sun, Nov 1"). Label each group by its first **listed** date
instead ("Week of Nov 1"), keeping the Monday-based grouping. Unit-test the label function.

## Acceptance criteria
- `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass with no `.env`.
  `pnpm` is not on PATH on this machine: run it as `npx -y pnpm@9.15.9 <script>`.
- The built home page ships **0** `<script>` tags; the tour page JS budget is unchanged (≤ 15 KB gzipped).
- `grep -ri "todo" dist/` finds nothing in any public HTML page (admin pages excluded).
- Home page: one `<h1>`; sections use headings in order; every link has descriptive text;
  `focus-visible` styles on all links/buttons; colour contrast AA; no layout shift from late content.
- At 1280×800 the hero and the start of the tours section are both visible without scrolling.
- No new dependencies. No `any`, `as never`, `@ts-ignore` or disabled lint rules.
- A dev server is already running on port 4321 in tmux session `tour-dev` (someone is viewing it
  through a tunnel). Do not stop or restart it; if you need your own server use another port and
  stop it by PID when done.
- `supabase/tests/owner-content.test.ts` has an uncommitted fix in the working tree; keep it.
- Don't touch git. End with a short report: files changed, acceptance results, anything you could not do.
