/**
 * Pure helpers for turning a booking row into Stripe Checkout amounts.
 *
 * Kept free of Stripe and Astro imports so the rules can be unit-tested: every
 * amount comes from the database, and the line items always add up to the
 * booking's stored total.
 */

export const HST_RATE_PERCENT = 13;

/** Stripe rejects a Checkout Session shorter than 30 minutes or longer than a day. */
const STRIPE_MIN_CHECKOUT_SECONDS = 30 * 60;
const STRIPE_MAX_CHECKOUT_SECONDS = 24 * 60 * 60;

/** One Checkout line item, in integer cents. */
export interface CheckoutLine {
  label: string;
  quantity: number;
  unitCents: number;
}

export interface CheckoutBookingAmounts {
  reference: string;
  adults: number;
  children: number;
  seniors: number;
  addons: ReadonlyArray<{ name: string; quantity: number; unitCents: number }>;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  packageName: string | null;
  adultCents: number | null;
  childCents: number | null;
  seniorCents: number | null;
}

function passengerLine(label: string, quantity: number, unitCents: number): CheckoutLine[] {
  return quantity > 0 ? [{ label, quantity, unitCents }] : [];
}

function lineTotal(lines: readonly CheckoutLine[]): number {
  return lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
}

/**
 * Builds one line per quote line: adults, children, seniors, each add-on, then
 * a separate HST line. Amounts are the ones stored on the booking, never a
 * price sent by the browser.
 *
 * If the catalogue changed between the reservation and Checkout (so the unit
 * prices no longer add up to the stored subtotal), the subtotal is billed as a
 * single line instead. Stripe must always charge the quoted total.
 */
export function buildCheckoutLines(booking: CheckoutBookingAmounts): CheckoutLine[] {
  const lines: CheckoutLine[] = [];

  if (booking.packageName !== null && booking.adultCents !== null) {
    const childCents = booking.childCents ?? booking.adultCents;
    const seniorCents = booking.seniorCents ?? booking.adultCents;

    lines.push(
      ...passengerLine(`${booking.packageName} — adult`, booking.adults, booking.adultCents),
      ...passengerLine(`${booking.packageName} — child`, booking.children, childCents),
      ...passengerLine(`${booking.packageName} — senior`, booking.seniors, seniorCents),
    );
  }

  for (const addon of booking.addons) {
    if (addon.quantity > 0) {
      lines.push({ label: addon.name, quantity: addon.quantity, unitCents: addon.unitCents });
    }
  }

  const priced =
    lineTotal(lines) === booking.subtotalCents
      ? lines
      : [
          {
            label: `Tour booking ${booking.reference}`,
            quantity: 1,
            unitCents: booking.subtotalCents,
          },
        ];

  return [
    ...priced,
    { label: `HST ${HST_RATE_PERCENT}%`, quantity: 1, unitCents: booking.taxCents },
  ];
}

/** True when the line items add up to the booking's stored total. */
export function linesMatchTotal(lines: readonly CheckoutLine[], totalCents: number): boolean {
  return lineTotal(lines) === totalCents;
}

/**
 * Stripe requires `expires_at` to be 30 minutes to 24 hours after the session
 * is created. The 30-minute hold starts a moment before Checkout is called, so
 * a minute of slack keeps the request valid; the extra minute is harmless
 * because `mark_booking_paid` copes with an expired hold.
 */
export function checkoutExpiresAt(holdExpiresAt: string | null, now = Date.now()): number {
  const nowSeconds = Math.floor(now / 1000);
  const earliest = nowSeconds + STRIPE_MIN_CHECKOUT_SECONDS + 60;
  const latest = nowSeconds + STRIPE_MAX_CHECKOUT_SECONDS;

  const hold = holdExpiresAt ? Math.floor(new Date(holdExpiresAt).getTime() / 1000) : Number.NaN;
  const desired = Number.isFinite(hold) ? hold : earliest;

  return Math.min(Math.max(desired, earliest), latest);
}
