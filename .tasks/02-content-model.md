# Task 02 — Content model (Sanity schemas, shared types, fixtures)

Read `AGENTS.md` first and follow it. This task builds on the scaffold already in the repo.

## Goal
Define every content type the marketing site needs in `packages/schema`, export matching TypeScript types, and add typed fixture data in `apps/web` so pages can be built before Sanity is connected.

## Step 0 — Upgrade Sanity
Upgrade `apps/studio` from Sanity 3 to the **latest stable Sanity v4** (`sanity`, `@sanity/vision`, and any related packages). Update `AGENTS.md` wherever it says "Sanity Studio v3" to say v4. `pnpm install` must finish with **no peer-dependency warnings related to Sanity**.

## Step 1 — Schemas in `packages/schema/src/`
One file per type, in `documents/` and `objects/`, all defined with `defineType` / `defineField` / `defineArrayMember`. Export them all from `src/index.ts` as `schemaTypes`.

Every field gets a `title` and, where it isn't obvious, a short `description` written for a **non-technical tour operator** (e.g. "Shown in Google search results. Keep it under 155 characters."). Add `validation` rules as listed. Add `preview` config to every document so lists in the Studio show a useful title, subtitle and image.

### Objects (`objects/`)
| Name | Fields |
|---|---|
| `seo` | `metaTitle` string (max 60, warning), `metaDescription` text (max 155, warning), `ogImage` image, `noIndex` boolean (default false) |
| `imageWithAlt` | image with `hotspot: true` + required `alt` string |
| `priceTier` | `label` string required (e.g. "Adult", "Child 3–12", "Senior 65+"), `priceCad` number required (min 0), `note` string |
| `itineraryStop` | `time` string (e.g. "8:00 AM"), `title` string required, `description` text, `durationMinutes` number |
| `faqItem` | `question` string required, `answer` portable text (blocks only: normal, h3, bullet list, link annotation) |
| `ctaButton` | `label` string required, `kind` string list ["book", "link", "phone", "whatsapp"] required, `url` url (required only when kind = "link") |

### Documents (`documents/`)
**`tour`**
- `title` string required; `slug` slug from title, required, unique
- `status` string list ["active", "seasonal", "hidden"] default "active"
- `shortDescription` text required, max 200; `body` portable text with headings h2/h3, lists, links, and inline `imageWithAlt`
- `heroImage` imageWithAlt required; `gallery` array of imageWithAlt (max 20)
- `durationHours` number required; `startTime` string; `groupSizeMax` number
- `priceTiers` array of priceTier, min 1, required
- `fromPriceCad` number, read-only, with a description explaining it is the lowest tier price (the frontend computes it; the field exists so GROQ can sort)
- `highlights` array of strings (max 8); `included` array of strings; `notIncluded` array of strings
- `itinerary` array of itineraryStop
- `pickupLocations` array of references to `pickupLocation`
- `faqs` array of faqItem
- `reviews` array of references to `review`
- `booking` object: `provider` string list ["fareharbor", "bokun", "peek", "none"] default "none", `productId` string, `bookingUrl` url — fields grouped in a `fieldset`
- `seasonalNote` string (e.g. "Boat cruise runs May–October")
- `seo` seo
- Use field **groups**: "Content", "Pricing & booking", "Media", "SEO". Default group "Content".

**`landingPage`** (pages for paid ads at `/lp/<slug>`)
- `title` string required (internal name); `slug` slug required
- `tour` reference to tour, required
- `variant` string list ["A", "B"] default "A"; `utmCampaign` string (description: match this to the Google Ads campaign name)
- `headline` string required; `subheadline` text
- `sections` array (page builder) of these inline object types, each with a `preview`:
  - `heroSection`: `image` imageWithAlt, `showRating` boolean, `cta` ctaButton
  - `benefitsSection`: `heading` string, `items` array of {`icon` string list ["clock","bus","users","ticket","shield","star"], `title` string, `text` string}
  - `itinerarySection`: `heading` string (uses the referenced tour's itinerary)
  - `reviewsSection`: `heading` string, `reviews` array of refs to review (max 6)
  - `faqSection`: `heading` string, `items` array of faqItem
  - `ctaSection`: `heading` string, `text` string, `cta` ctaButton
- `seo` seo (set `noIndex` default **true** for landing pages)

**`review`**
- `authorName` string required; `authorLocation` string; `rating` number required, integer 1–5
- `text` text required; `date` date required
- `source` string list ["google", "tripadvisor", "facebook", "direct"] required; `sourceUrl` url
- `featured` boolean

**`pickupLocation`**
- `name` string required (e.g. "Union Station – Front St entrance"); `address` string required
- `geo` geopoint; `pickupTime` string; `notes` text

**`guide`**
- `name` string required; `photo` imageWithAlt; `bio` text max 400; `languages` array of strings

**`siteSettings`** — **singleton** (expand the existing one)
- `siteName` string required; `tagline` string
- `phone` string required; `whatsapp` string; `email` string required (email validation)
- `address` text; `logo` image
- `defaultSeo` seo
- `socialLinks` array of {`platform` string list ["facebook","instagram","tiktok","youtube","tripadvisor","google"], `url` url}
- `announcementBar` object {`enabled` boolean, `text` string, `link` url}
- `trustBadges` array of {`label` string, `image` image}

## Step 2 — Studio structure (`apps/studio`)
- Custom `structureTool` structure: "Site settings" (singleton, opens the one document with fixed ID `siteSettings`), then lists for Tours, Landing pages, Reviews, Pickup locations, Guides.
- Hide `siteSettings` from the "new document" menu and block delete/duplicate on it.

## Step 3 — TypeScript types (`packages/schema/src/types.ts`)
Hand-write TypeScript interfaces that match the schemas exactly (`Tour`, `LandingPage`, `LandingSection` as a discriminated union on `_type`, `Review`, `PickupLocation`, `Guide`, `SiteSettings`, `Seo`, `ImageWithAlt`, `PriceTier`, `ItineraryStop`, `FaqItem`, `CtaButton`).
- Portable text: type it as `PortableTextBlock[]` from `@portabletext/types`.
- In the frontend model, references are **resolved** (e.g. `pickupLocations: PickupLocation[]`, not refs).
- Images in the frontend model: `{ src: string; alt: string; width: number; height: number }`.
- Export all types from the package root.
- Add a pure helper `getFromPrice(tour: Pick<Tour, 'priceTiers'>): number` in `packages/schema/src/utils.ts` and export it.

## Step 4 — Fixtures (`apps/web/src/data/`)
- `fixtures.ts` exporting `siteSettings`, `tours` (3 tours), `reviews` (8), `pickupLocations` (4), `landingPages` (2), all typed with the package types. Typecheck must fail if a fixture doesn't match its type.
- The three tours, realistic but clearly sample data:
  1. "Niagara Falls Day Tour from Toronto": 10 h, adult $149 / child $119, Hornblower cruise included, 6 itinerary stops
  2. "Niagara Falls Evening Tour with Fireworks": 7 h, seasonal (status "seasonal")
  3. "Niagara-on-the-Lake Wine Country Tour": 8 h, includes 3 winery tastings, adults only
- Pickup locations: real Toronto places (Union Station, Eaton Centre area hotel, Fairmont Royal York, North York Centre).
- Images: use `/images/placeholder-*.jpg` paths plus width/height. **Don't** add binary files; add one `public/images/README.md` explaining that real photos go there.
- `apps/web/src/lib/content.ts` with async functions `getSiteSettings()`, `getTours()`, `getTourBySlug(slug)`, `getLandingPageBySlug(slug)`, `getFeaturedReviews(limit)`. For now they return fixtures. Add a top-of-file comment saying they'll switch to Sanity GROQ queries in a later task, keeping the same signatures.

## Acceptance criteria
- `pnpm install && pnpm lint && pnpm typecheck && pnpm build` all exit 0, with no Sanity peer warnings
- The Studio builds and every document type appears in the structure
- `apps/web` still ships 0 KB JS (don't change pages in this task)
- No `any`, no `@ts-ignore`, no disabled lint rules

## Do NOT
- create or change pages/routes in `apps/web` (later task)
- add a Sanity client or network fetching yet
- touch git
