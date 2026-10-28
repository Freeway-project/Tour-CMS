import type { CollectionEntry } from 'astro:content';

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

/** Content collection types, inferred from the schemas in `src/content.config.ts`. */
export type Review = CollectionEntry<'reviews'>['data'];
export type Faq = CollectionEntry<'faqs'>['data'];
export type SiteSettings = CollectionEntry<'site'>['data'];
