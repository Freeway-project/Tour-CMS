// No content collection dependency: content now lives in Supabase.
/**
 * Domain types.
 *
 * The catalogue types mirror the Supabase tables in `supabase/migrations`:
 * database rows use snake_case and integer cents, these types use camelCase and
 * integer cents. Mapping happens in `src/lib/db/`.
 */

export type TourStatus = 'active' | 'seasonal' | 'hidden';
export type AddonPricing = 'per_person' | 'per_booking';
export type PackagePricingMode = 'per_person' | 'per_group';
export type DepartureStatus = 'open' | 'closed' | 'cancelled';

export interface Package {
  id: string;
  tourId: string;
  name: string;
  description: string | null;
  includes: string[];
  /**
   * Adult price per person, or — when `pricingMode` is `per_group` — the flat
   * price for the whole vehicle.
   */
  priceAdultCents: number;
  priceChildCents: number | null;
  priceSeniorCents: number | null;
  pricingMode: PackagePricingMode;
  /** Vehicle capacity for a `per_group` package; null for `per_person`. */
  maxPax: number | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Addon {
  id: string;
  tourId: string;
  name: string;
  description: string | null;
  priceCents: number;
  pricing: AddonPricing;
  isActive: boolean;
  sortOrder: number;
}

export interface PickupLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  pickupNote: string | null;
  isActive: boolean;
  /** Set per tour by `tour_pickups.pickup_time`; null when not joined. */
  pickupTime: string | null;
}

export interface ItineraryStop {
  /** Local Toronto time, `HH:MM`. */
  time: string;
  title: string;
  detail: string | null;
}

export interface Photo {
  /** Public URL of the image (Supabase Storage or a local `/images/` file). */
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface TourImage extends Photo {
  id: string;
  isHero: boolean;
  sortOrder: number;
}

export interface Tour {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  /** Markdown. */
  description: string;
  durationMinutes: number;
  heroImagePath: string;
  status: TourStatus;
  isPrivate: boolean;
  sortOrder: number;
  highlights: string[];
  /** Markdown. */
  importantInfo: string | null;
  /** Shared tours: the group limit shown to visitors. Null for private tours. */
  maxGuests: number | null;
  itinerary: ItineraryStop[];
  excludes: string[];
  /** Sorted by `sortOrder`. */
  images: TourImage[];
  packages: Package[];
  addons: Addon[];
  pickups: PickupLocation[];
}

export interface Departure {
  id: string;
  tourId: string;
  /** ISO 8601 timestamptz. */
  startsAt: string;
  capacity: number;
  status: DepartureStatus;
  seatsLeft: number;
}

/** One bookable departure as returned by `/api/availability`. */
export interface AvailabilitySlot {
  departureId: string;
  /** ISO 8601 timestamptz. */
  startsAt: string;
  seatsLeft: number;
}

export interface QuoteLine {
  label: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
}

export interface BookingQuote {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  lines: QuoteLine[];
}

export interface Faq {
  id: string;
  question: string;
  /** Markdown. */
  answer: string;
  tourId: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface Review {
  id: string;
  author: string;
  location: string | null;
  rating: number;
  text: string;
  /** ISO date, `YYYY-MM-DD`. */
  reviewDate: string;
  source: 'google' | 'tripadvisor' | 'viator' | 'direct';
  tourId: string | null;
  featured: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface SiteRating {
  platform: string;
  score: number;
  count: number;
  url: string;
}

export interface SiteSettings {
  name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hstNumber: string | null;
  cancellationPolicy: string;
  privacyPolicy: string;
  terms: string;
  announcement: { enabled: boolean; text: string; href: string | null };
  guide: { name: string; bio: string; photo: Photo | null };
  vehicle: { text: string; photo: Photo | null };
  ratings: SiteRating[];
  lastPublishAt: string | null;
}
