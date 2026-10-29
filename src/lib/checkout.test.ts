import { describe, expect, it } from 'vitest';

import {
  buildCheckoutLines,
  checkoutExpiresAt,
  linesMatchTotal,
  type CheckoutBookingAmounts,
} from './checkout';

const booking: CheckoutBookingAmounts = {
  reference: 'TN-ABC123',
  adults: 2,
  children: 1,
  seniors: 0,
  addons: [{ name: 'Wine tasting', quantity: 3, unitCents: 2500 }],
  subtotalCents: 2 * 9900 + 7920 + 3 * 2500,
  taxCents: Math.round((2 * 9900 + 7920 + 3 * 2500) * 0.13),
  totalCents: 2 * 9900 + 7920 + 3 * 2500 + Math.round((2 * 9900 + 7920 + 3 * 2500) * 0.13),
  packageName: 'Day tour',
  adultCents: 9900,
  childCents: 7920,
  seniorCents: null,
};

describe('buildCheckoutLines', () => {
  it('bills one line per quote line plus a separate HST line', () => {
    const lines = buildCheckoutLines(booking);

    expect(lines).toEqual([
      { label: 'Day tour — adult', quantity: 2, unitCents: 9900 },
      { label: 'Day tour — child', quantity: 1, unitCents: 7920 },
      { label: 'Wine tasting', quantity: 3, unitCents: 2500 },
      { label: 'HST 13%', quantity: 1, unitCents: booking.taxCents },
    ]);
    expect(linesMatchTotal(lines, booking.totalCents)).toBe(true);
  });

  it('falls back to the stored subtotal when the catalogue price changed', () => {
    const lines = buildCheckoutLines({ ...booking, adultCents: 12900 });

    expect(lines).toEqual([
      { label: 'Tour booking TN-ABC123', quantity: 1, unitCents: booking.subtotalCents },
      { label: 'HST 13%', quantity: 1, unitCents: booking.taxCents },
    ]);
    expect(linesMatchTotal(lines, booking.totalCents)).toBe(true);
  });

  it('never uses a browser-supplied amount', () => {
    const lines = buildCheckoutLines(booking);
    expect(linesMatchTotal(lines, booking.totalCents + 1)).toBe(false);
  });
});

describe('checkoutExpiresAt', () => {
  const now = Date.UTC(2026, 9, 29, 12, 0, 0);

  it("uses the booking's hold when Stripe accepts it", () => {
    const hold = new Date(now + 40 * 60 * 1000).toISOString();
    expect(checkoutExpiresAt(hold, now)).toBe(Math.floor(now / 1000) + 40 * 60);
  });

  it('never asks for less than 30 minutes', () => {
    const hold = new Date(now + 5 * 60 * 1000).toISOString();
    expect(checkoutExpiresAt(hold, now)).toBe(Math.floor(now / 1000) + 31 * 60);
  });

  it('never asks for more than 24 hours', () => {
    const hold = new Date(now + 48 * 60 * 60 * 1000).toISOString();
    expect(checkoutExpiresAt(hold, now)).toBe(Math.floor(now / 1000) + 24 * 60 * 60);
  });
});
