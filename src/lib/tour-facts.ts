import { formatClockTime } from './datetime';
import { formatCad, formatDuration } from './format';
import { isPlaceholder } from './placeholder';
import { fromPriceInclHst, groupLimit } from './pricing';
import type { Tour } from './types';

/** The few facts a visitor decides on, built only from data. */
export interface TourFacts {
  price: string | null;
  priceUnit: string | null;
  guests: string | null;
  duration: string;
  pickup: string | null;
}

export function tourFacts(tour: Tour): TourFacts {
  const price = fromPriceInclHst(tour);
  const limit = groupLimit(tour);
  const pickup = tour.pickups.find(
    (entry) => entry.isActive && entry.pickupTime && !isPlaceholder(entry.name),
  );

  return {
    price: price ? formatCad(price.cents) : null,
    priceUnit: price ? (price.unit === 'person' ? 'per adult, including HST' : 'per vehicle, including HST') : null,
    guests: limit ? (tour.isPrivate ? `Up to ${limit} guests per vehicle` : `Max ${limit} guests`) : null,
    duration: formatDuration(tour.durationMinutes),
    pickup: pickup?.pickupTime ? `Pickup ${formatClockTime(pickup.pickupTime)} at ${pickup.name}` : null,
  };
}

/** Distinct real inclusions across the tour's active packages, in order. */
export function tourInclusions(tour: Tour): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const pkg of tour.packages) {
    if (!pkg.isActive) continue;
    for (const item of pkg.includes) {
      if (isPlaceholder(item) || seen.has(item)) continue;
      seen.add(item);
      items.push(item);
    }
  }
  return items;
}

const CRUISE = /\b(boat|cruise)\b/i;

/**
 * Whether the boat cruise is included, only when the data says so: an active
 * package lists it (included) or the tour's "not included" list names it
 * (not included). Anything else is `null`: unknown, never assumed.
 */
export function boatCruiseStatus(tour: Tour): 'included' | 'not-included' | null {
  if (tourInclusions(tour).some((item) => CRUISE.test(item))) return 'included';
  if (tour.excludes.some((item) => !isPlaceholder(item) && CRUISE.test(item))) return 'not-included';
  return null;
}
