import { describe, expect, it } from 'vitest';

import { HST_RATE_PERCENT, quote } from './pricing';
import type { Addon, Package } from './types';

function makePackage(overrides: Partial<Package> = {}): Package {
  return {
    id: 'package-day-boat',
    tourId: 'tour-niagara-falls-day',
    name: '+ Boat cruise',
    description: null,
    includes: [],
    priceAdultCents: 15900,
    priceChildCents: 12720,
    priceSeniorCents: null,
    isActive: true,
    sortOrder: 1,
    ...overrides,
  };
}

function makeAddon(overrides: Partial<Addon> = {}): Addon {
  return {
    id: 'addon-lunch',
    tourId: 'tour-niagara-falls-day',
    name: 'Lunch at Table Rock',
    description: null,
    priceCents: 2500,
    pricing: 'per_person',
    isActive: true,
    sortOrder: 1,
    ...overrides,
  };
}

describe('quote', () => {
  it('matches the SQL seed case: 2 adults + 1 child + 3 lunches on "+ Boat cruise"', () => {
    // This is the same case as `supabase/tests/schema.test.ts`, so the two
    // implementations are proven to agree: 2 × 15900 + 1 × 12720 + 3 × 2500.
    const result = quote({
      pkg: makePackage(),
      addons: [{ addon: makeAddon(), quantity: 3 }],
      adults: 2,
      children: 1,
    });

    expect(HST_RATE_PERCENT).toBe(13);
    expect(result.subtotalCents).toBe(52020);
    expect(result.taxCents).toBe(6763);
    expect(result.totalCents).toBe(58783);
  });

  it('falls back to the adult price when a child or senior price is missing', () => {
    const result = quote({
      pkg: makePackage({ priceChildCents: null, priceSeniorCents: null }),
      adults: 1,
      children: 1,
      seniors: 1,
    });

    expect(result.subtotalCents).toBe(47700);
    expect(result.totalCents).toBe(53901);
  });

  it('charges a per-booking add-on once whatever quantity is passed', () => {
    const airportDropOff = makeAddon({
      id: 'addon-airport-dropoff',
      name: 'Airport drop-off',
      priceCents: 6000,
      pricing: 'per_booking',
    });

    const result = quote({
      pkg: makePackage(),
      addons: [
        { addon: airportDropOff, quantity: 1 },
        { addon: airportDropOff, quantity: 4 },
      ],
      adults: 2,
    });

    const addonLines = result.lines.filter((line) => line.label === 'Airport drop-off');
    expect(addonLines).toHaveLength(2);
    expect(addonLines[0]?.quantity).toBe(1);
    expect(addonLines[1]?.quantity).toBe(1);
    expect(result.subtotalCents).toBe(2 * 15900 + 2 * 6000);
  });

  it('returns zero when there are no passengers and no add-ons', () => {
    const result = quote({ pkg: makePackage(), adults: 0 });

    expect(result.subtotalCents).toBe(0);
    expect(result.taxCents).toBe(0);
    expect(result.totalCents).toBe(0);
    expect(result.lines).toEqual([]);
  });
});
