import { describe, expect, it } from 'vitest';

import { tours } from '../data/fixtures';
import { fromPrice, HST_RATE_PERCENT, quote } from './pricing';
import type { Addon, Package, Tour } from './types';

function makePackage(overrides: Partial<Package> = {}): Package {
  return {
    id: 'package-day-tour',
    tourId: 'tour-niagara-falls-day',
    name: 'Day tour',
    description: null,
    includes: [],
    priceAdultCents: 9900,
    priceChildCents: null,
    priceSeniorCents: null,
    pricingMode: 'per_person',
    maxPax: null,
    isActive: true,
    sortOrder: 1,
    ...overrides,
  };
}

function makeAddon(overrides: Partial<Addon> = {}): Addon {
  return {
    id: 'addon-test',
    tourId: 'tour-niagara-falls-day',
    name: 'Test add-on',
    description: null,
    priceCents: 2500,
    pricing: 'per_person',
    isActive: true,
    sortOrder: 1,
    ...overrides,
  };
}

function makeVanPackage(overrides: Partial<Package> = {}): Package {
  return makePackage({
    id: 'package-private-van-6',
    tourId: 'tour-private-niagara-falls',
    name: 'Sprinter van',
    priceAdultCents: 69900,
    pricingMode: 'per_group',
    maxPax: 6,
    ...overrides,
  });
}

function fixtureTour(slug: string): Tour {
  const found = tours.find((tour) => tour.slug === slug);
  if (!found) throw new Error(`No fixture tour with slug "${slug}"`);
  return found;
}

describe('quote', () => {
  it('matches the SQL seed case: 2 adults + 1 child + 3 add-ons on "Day tour"', () => {
    // This is the same case as `supabase/tests/schema.test.ts`, so the two
    // implementations are proven to agree: 2 × 9900 + 1 × 7920 + 3 × 2500.
    const result = quote({
      pkg: makePackage({ priceChildCents: 7920 }),
      addons: [{ addon: makeAddon(), quantity: 3 }],
      adults: 2,
      children: 1,
    });

    expect(HST_RATE_PERCENT).toBe(13);
    expect(result.subtotalCents).toBe(35220);
    expect(result.taxCents).toBe(4579);
    expect(result.totalCents).toBe(39799);
  });

  it('falls back to the adult price when a child or senior price is missing', () => {
    const result = quote({
      pkg: makePackage({ priceChildCents: null, priceSeniorCents: null }),
      adults: 1,
      children: 1,
      seniors: 1,
    });

    expect(result.subtotalCents).toBe(29700);
    expect(result.totalCents).toBe(33561);
  });

  it('charges a per-booking add-on once whatever quantity is passed', () => {
    const perBookingAddon = makeAddon({
      id: 'addon-per-booking',
      name: 'Per-booking add-on',
      priceCents: 6000,
      pricing: 'per_booking',
    });

    const result = quote({
      pkg: makePackage(),
      addons: [
        { addon: perBookingAddon, quantity: 1 },
        { addon: perBookingAddon, quantity: 4 },
      ],
      adults: 2,
    });

    const addonLines = result.lines.filter((line) => line.label === 'Per-booking add-on');
    expect(addonLines).toHaveLength(2);
    expect(addonLines[0]?.quantity).toBe(1);
    expect(addonLines[1]?.quantity).toBe(1);
    expect(result.subtotalCents).toBe(2 * 9900 + 2 * 6000);
  });

  it('prices seniors and a per-booking add-on together', () => {
    const parkingAddon = makeAddon({
      id: 'addon-parking',
      name: 'Parking',
      priceCents: 1500,
      pricing: 'per_booking',
    });

    const result = quote({
      pkg: makePackage({ priceChildCents: 7920, priceSeniorCents: 8910 }),
      addons: [{ addon: parkingAddon, quantity: 3 }],
      adults: 1,
      seniors: 2,
    });

    // 1 × 9900 + 2 × 8910 + 1 × 1500 (per booking, not × 3) = 29220.
    expect(result.lines).toEqual([
      {
        label: 'Day tour — adult',
        quantity: 1,
        unitCents: 9900,
        totalCents: 9900,
      },
      {
        label: 'Day tour — senior',
        quantity: 2,
        unitCents: 8910,
        totalCents: 17820,
      },
      {
        label: 'Parking',
        quantity: 1,
        unitCents: 1500,
        totalCents: 1500,
      },
    ]);
    expect(result.subtotalCents).toBe(29220);
    expect(result.taxCents).toBe(3799);
    expect(result.totalCents).toBe(33019);
  });

  it('returns zero when there are no passengers and no add-ons', () => {
    const result = quote({ pkg: makePackage(), adults: 0 });

    expect(result.subtotalCents).toBe(0);
    expect(result.taxCents).toBe(0);
    expect(result.totalCents).toBe(0);
    expect(result.lines).toEqual([]);
  });

  it('charges a per-group package as one flat price for the vehicle', () => {
    const result = quote({
      pkg: makeVanPackage(),
      adults: 4,
      children: 1,
      seniors: 1,
    });

    expect(result.lines).toEqual([
      {
        label: 'Sprinter van (up to 6 people)',
        quantity: 1,
        unitCents: 69900,
        totalCents: 69900,
      },
    ]);
    expect(result.subtotalCents).toBe(69900);
    expect(result.taxCents).toBe(9087);
    expect(result.totalCents).toBe(78987);
  });

  it('throws when a per-group booking is bigger than the vehicle', () => {
    expect(() => quote({ pkg: makeVanPackage(), adults: 7 })).toThrow(/more than the 6 allowed/);
  });
});

describe('fromPrice', () => {
  it('uses the lowest per-person price on the shared day tour', () => {
    expect(fromPrice(fixtureTour('niagara-falls-day-tour'))).toEqual({
      cents: 9900,
      unit: 'person',
    });
  });

  it('falls back to the lowest per-vehicle price on the private tour', () => {
    expect(fromPrice(fixtureTour('private-niagara-falls-tour'))).toEqual({
      cents: 69900,
      unit: 'vehicle',
    });
  });

  it('returns null when a tour has nothing to sell', () => {
    const empty: Tour = { ...fixtureTour('niagara-falls-day-tour'), packages: [] };
    expect(fromPrice(empty)).toBeNull();
  });
});
