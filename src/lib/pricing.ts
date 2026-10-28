import type { Addon, BookingQuote, Package, QuoteLine, Tour } from './types';

/**
 * Pricing rules. These must match `public.reserve_booking` exactly:
 * - adult price always comes from the package;
 * - a missing child or senior price falls back to the adult price;
 * - a `per_group` package is charged once for the whole vehicle, up to `maxPax`;
 * - `per_person` add-ons multiply by quantity, `per_booking` ones count once;
 * - HST is 13% of the subtotal, rounded to the nearest cent.
 *
 * The server is the source of truth: this module is for display quotes only and
 * the SQL function recomputes every price when a booking is created. Private
 * (`per_group`) tours cannot be booked online at all, so quoting one is only for
 * showing a price.
 */

export const HST_RATE_PERCENT = 13;

export interface QuoteAddon {
  addon: Addon;
  quantity: number;
}

export interface QuoteInput {
  pkg: Package;
  addons?: QuoteAddon[];
  adults: number;
  children?: number;
  seniors?: number;
}

/** The cheapest way to join a tour, for "From $99 per person" style copy. */
export interface FromPrice {
  cents: number;
  unit: 'person' | 'vehicle';
}

function toCount(value: number | undefined): number {
  if (!value || value < 0) return 0;
  return Math.trunc(value);
}

function line(label: string, quantity: number, unitCents: number): QuoteLine {
  return { label, quantity, unitCents, totalCents: quantity * unitCents };
}

export function quote({ pkg, addons = [], adults, children, seniors }: QuoteInput): BookingQuote {
  const adultCount = toCount(adults);
  const childCount = toCount(children);
  const seniorCount = toCount(seniors);
  const pax = adultCount + childCount + seniorCount;

  const lines: QuoteLine[] = [];

  if (pkg.pricingMode === 'per_group') {
    // One flat price for the vehicle, however the group is made up.
    if (pkg.maxPax === null) {
      throw new Error(`Package "${pkg.name}" is priced per group but has no maximum group size`);
    }

    if (pax > pkg.maxPax) {
      throw new Error(`${pax} people is more than the ${pkg.maxPax} allowed in "${pkg.name}"`);
    }

    if (pax > 0) {
      lines.push(line(`${pkg.name} (up to ${pkg.maxPax} people)`, 1, pkg.priceAdultCents));
    }
  } else {
    const adultPrice = pkg.priceAdultCents;
    const childPrice = pkg.priceChildCents ?? adultPrice;
    const seniorPrice = pkg.priceSeniorCents ?? adultPrice;

    if (adultCount > 0) lines.push(line(`${pkg.name} — adult`, adultCount, adultPrice));
    if (childCount > 0) lines.push(line(`${pkg.name} — child`, childCount, childPrice));
    if (seniorCount > 0) lines.push(line(`${pkg.name} — senior`, seniorCount, seniorPrice));
  }

  for (const { addon, quantity } of addons) {
    const count = addon.pricing === 'per_booking' ? (quantity > 0 ? 1 : 0) : toCount(quantity);
    if (count === 0) continue;
    lines.push(line(addon.name, count, addon.priceCents));
  }

  const subtotalCents = lines.reduce((sum, entry) => sum + entry.totalCents, 0);
  const taxCents = Math.round((subtotalCents * HST_RATE_PERCENT) / 100);

  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    lines,
  };
}

/**
 * The lowest per-person price on a tour, or — for a private tour with only
 * per-group packages — the lowest per-vehicle price. Null when the tour has no
 * active packages to show.
 */
export function fromPrice(tour: Tour): FromPrice | null {
  const active = tour.packages.filter((pkg) => pkg.isActive);

  const perPerson = active.filter((pkg) => pkg.pricingMode === 'per_person');
  if (perPerson.length > 0) {
    return {
      cents: Math.min(...perPerson.map((pkg) => pkg.priceAdultCents)),
      unit: 'person',
    };
  }

  const perGroup = active.filter((pkg) => pkg.pricingMode === 'per_group');
  if (perGroup.length > 0) {
    return {
      cents: Math.min(...perGroup.map((pkg) => pkg.priceAdultCents)),
      unit: 'vehicle',
    };
  }

  return null;
}
