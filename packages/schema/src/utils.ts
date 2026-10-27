import type { Tour } from './types';

/**
 * Returns the lowest price across a tour's price tiers, or 0 when there are none.
 * This is what the `fromPriceCad` field stores once the frontend resolves a tour.
 */
export function getFromPrice(tour: Pick<Tour, 'priceTiers'>): number {
  if (tour.priceTiers.length === 0) {
    return 0;
  }

  return Math.min(...tour.priceTiers.map((tier) => tier.priceCad));
}
