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
