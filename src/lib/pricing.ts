import type { Addon, BookingQuote, Package, QuoteLine } from './types';

/**
 * Pricing rules. These must match `public.reserve_booking` exactly:
 * - adult price always comes from the package;
 * - a missing child or senior price falls back to the adult price;
 * - `per_person` add-ons multiply by quantity, `per_booking` ones count once;
 * - HST is 13% of the subtotal, rounded to the nearest cent.
 *
 * The server is the source of truth: this module is for display quotes only and
 * the SQL function recomputes every price when a booking is created.
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

  const adultPrice = pkg.priceAdultCents;
  const childPrice = pkg.priceChildCents ?? adultPrice;
  const seniorPrice = pkg.priceSeniorCents ?? adultPrice;

  const lines: QuoteLine[] = [];

  if (adultCount > 0) lines.push(line(`${pkg.name} — adult`, adultCount, adultPrice));
  if (childCount > 0) lines.push(line(`${pkg.name} — child`, childCount, childPrice));
  if (seniorCount > 0) lines.push(line(`${pkg.name} — senior`, seniorCount, seniorPrice));

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
