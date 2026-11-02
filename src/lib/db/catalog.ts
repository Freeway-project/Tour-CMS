import { getFixtureDepartures, pickupLocations, tours } from '../../data/fixtures';
import { PUBLIC_SUPABASE_URL } from 'astro:env/client';

import { storageImageUrl } from '../photos';
import type {
  Addon,
  AddonPricing,
  Departure,
  DepartureStatus,
  ItineraryStop,
  Package,
  PackagePricingMode,
  PickupLocation,
  Tour,
  TourImage,
  TourStatus,
} from '../types';
import { supabase } from './client';

/**
 * Catalogue queries. Every function falls back to the fixtures in
 * `src/data/fixtures.ts` when Supabase is not configured, so the marketing site
 * builds with no `.env`.
 *
 * Database rows are snake_case; the rest of the app is camelCase. Mapping is
 * kept in this file so no other module needs to know the column names.
 */

interface PackageRow {
  id: string;
  tour_id: string;
  name: string;
  description: string | null;
  includes: string[] | null;
  price_adult_cents: number;
  price_child_cents: number | null;
  price_senior_cents: number | null;
  pricing_mode: string;
  max_pax: number | null;
  is_active: boolean;
  sort_order: number;
}

interface AddonRow {
  id: string;
  tour_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  pricing: string;
  is_active: boolean;
  sort_order: number;
}

interface PickupLocationRow {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  pickup_note: string | null;
  is_active: boolean;
}

interface TourPickupRow {
  pickup_time: string;
  pickup_locations: PickupLocationRow | null;
}

interface TourImageRow {
  id: string;
  storage_path: string;
  alt: string;
  width: number;
  height: number;
  sort_order: number;
  is_hero: boolean;
}

interface TourRow {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  duration_minutes: number;
  hero_image_path: string;
  status: string;
  is_private: boolean;
  sort_order: number;
  highlights: string[] | null;
  important_info: string | null;
  max_guests: number | null;
  itinerary: unknown;
  excludes: string[] | null;
  tour_images: TourImageRow[] | null;
  packages: PackageRow[] | null;
  addons: AddonRow[] | null;
  tour_pickups: TourPickupRow[] | null;
}

interface DepartureRow {
  id: string;
  tour_id: string;
  starts_at: string;
  capacity: number;
  status: string;
  seats_left: number;
}

const TOUR_SELECT = `
  id,
  slug,
  title,
  short_description,
  description,
  duration_minutes,
  hero_image_path,
  status,
  is_private,
  sort_order,
  highlights,
  important_info,
  max_guests,
  itinerary,
  excludes,
  tour_images(id, storage_path, alt, width, height, sort_order, is_hero),
  packages(id, tour_id, name, description, includes, price_adult_cents, price_child_cents, price_senior_cents, pricing_mode, max_pax, is_active, sort_order),
  addons(id, tour_id, name, description, price_cents, pricing, is_active, sort_order),
  tour_pickups(pickup_time, pickup_locations(id, name, address, lat, lng, pickup_note, is_active))
`;

function toAddonPricing(value: string): AddonPricing {
  return value === 'per_booking' ? 'per_booking' : 'per_person';
}

function toPackagePricingMode(value: string): PackagePricingMode {
  return value === 'per_group' ? 'per_group' : 'per_person';
}

function toTourStatus(value: string): TourStatus {
  return value === 'seasonal' || value === 'hidden' ? value : 'active';
}

function toDepartureStatus(value: string): DepartureStatus {
  return value === 'closed' || value === 'cancelled' ? value : 'open';
}

function mapPackage(row: PackageRow): Package {
  return {
    id: row.id,
    tourId: row.tour_id,
    name: row.name,
    description: row.description,
    includes: row.includes ?? [],
    priceAdultCents: row.price_adult_cents,
    priceChildCents: row.price_child_cents,
    priceSeniorCents: row.price_senior_cents,
    pricingMode: toPackagePricingMode(row.pricing_mode),
    maxPax: row.max_pax,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

function mapAddon(row: AddonRow): Addon {
  return {
    id: row.id,
    tourId: row.tour_id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    pricing: toAddonPricing(row.pricing),
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

function mapPickupLocation(row: PickupLocationRow, time: string | null): PickupLocation {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    pickupNote: row.pickup_note,
    isActive: row.is_active,
    pickupTime: time,
  };
}

/** Keeps only well-formed `{ time, title, detail }` entries, in stored order. */
export function parseItinerary(value: unknown): ItineraryStop[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { time, title, detail } = entry as Record<string, unknown>;
    if (typeof time !== 'string' || typeof title !== 'string' || title.trim() === '') return [];
    return [{ time, title, detail: typeof detail === 'string' && detail.trim() !== '' ? detail : null }];
  });
}

function mapTourImage(row: TourImageRow): TourImage | null {
  if (!PUBLIC_SUPABASE_URL) return null;
  return {
    id: row.id,
    src: storageImageUrl(PUBLIC_SUPABASE_URL, row.storage_path),
    alt: row.alt,
    width: row.width,
    height: row.height,
    isHero: row.is_hero,
    sortOrder: row.sort_order,
  };
}

function mapTour(row: TourRow): Tour {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description,
    description: row.description,
    durationMinutes: row.duration_minutes,
    heroImagePath: row.hero_image_path,
    status: toTourStatus(row.status),
    isPrivate: row.is_private,
    sortOrder: row.sort_order,
    highlights: row.highlights ?? [],
    importantInfo: row.important_info,
    maxGuests: row.max_guests,
    itinerary: parseItinerary(row.itinerary),
    excludes: row.excludes ?? [],
    images: (row.tour_images ?? [])
      .map(mapTourImage)
      .filter((image): image is TourImage => image !== null)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    packages: (row.packages ?? [])
      .filter((pkg) => pkg.is_active)
      .map(mapPackage)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    addons: (row.addons ?? []).map(mapAddon).sort((a, b) => a.sortOrder - b.sortOrder),
    pickups: (row.tour_pickups ?? []).flatMap((entry) =>
      entry.pickup_locations ? [mapPickupLocation(entry.pickup_locations, entry.pickup_time)] : [],
    ),
  };
}

function mapDeparture(row: DepartureRow): Departure {
  return {
    id: row.id,
    tourId: row.tour_id,
    startsAt: row.starts_at,
    capacity: row.capacity,
    status: toDepartureStatus(row.status),
    seatsLeft: row.seats_left,
  };
}

export async function getTours(): Promise<Tour[]> {
  if (!supabase) {
    return [...tours].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  const { data, error } = await supabase
    .from('tours')
    .select(TOUR_SELECT)
    .order('sort_order', { ascending: true });

  if (error) throw new Error(`Failed to load tours: ${error.message}`);

  return (data as unknown as TourRow[]).map(mapTour);
}

export async function getTourBySlug(slug: string): Promise<Tour | undefined> {
  if (!supabase) {
    return tours.find((tour) => tour.slug === slug);
  }

  const { data, error } = await supabase
    .from('tours')
    .select(TOUR_SELECT)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`Failed to load tour "${slug}": ${error.message}`);

  return data ? mapTour(data as unknown as TourRow) : undefined;
}

export async function getDepartures(
  tourId: string,
  from: Date | string,
  to: Date | string,
): Promise<Departure[]> {
  const fromIso = new Date(from).toISOString();
  const toIso = new Date(to).toISOString();
  const fromTime = Date.parse(fromIso);
  const toTime = Date.parse(toIso);

  if (!supabase) {
    return getFixtureDepartures()
      .filter((departure) => {
        const startsAt = Date.parse(departure.startsAt);
        return departure.tourId === tourId && startsAt >= fromTime && startsAt <= toTime;
      })
      .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  }

  const { data, error } = await supabase
    .from('departure_availability')
    .select('id, tour_id, starts_at, capacity, status, seats_left')
    .eq('tour_id', tourId)
    .gte('starts_at', fromIso)
    .lte('starts_at', toIso)
    .order('starts_at', { ascending: true });

  if (error) throw new Error(`Failed to load departures: ${error.message}`);

  return (data as unknown as DepartureRow[]).map(mapDeparture);
}

/** Pickup points shared by every tour, used by pages that have no tour yet. */
export function getPickupLocations(): PickupLocation[] {
  return pickupLocations;
}
