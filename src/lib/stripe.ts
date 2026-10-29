import type { SupabaseClient } from '@supabase/supabase-js';
import { STRIPE_SECRET_KEY } from 'astro:env/server';
import Stripe from 'stripe';

import { buildCheckoutLines, checkoutExpiresAt } from './checkout';

/**
 * Server-only Stripe client.
 *
 * The browser never sees Stripe.js: the booking widget redirects to the hosted
 * Checkout page. `createFetchHttpClient` keeps the SDK on `fetch`, which is what
 * runs on Cloudflare Workers.
 *
 * `STRIPE_SECRET_KEY` is declared in `astro.config.mjs` as a server secret, so
 * Vite fails the build if this module ever reaches a client bundle.
 */

let cached: Stripe | null | undefined;

export function isStripeConfigured(): boolean {
  return Boolean(STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;

  cached = STRIPE_SECRET_KEY
    ? new Stripe(STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() })
    : null;

  return cached;
}

interface CheckoutBookingRow {
  id: string;
  reference: string;
  access_token: string;
  customer_email: string | null;
  hold_expires_at: string | null;
  adults: number;
  children: number;
  seniors: number;
  addons: Array<{ name: string; quantity: number; unit_cents: number }> | null;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  packages: {
    name: string;
    price_adult_cents: number;
    price_child_cents: number | null;
    price_senior_cents: number | null;
  } | null;
  departures: { starts_at: string; tours: { title: string; slug: string } | null } | null;
}

/**
 * Creates a Checkout Session for a pending booking and stores its id.
 *
 * Returns null when Stripe is not configured (the site then keeps the
 * "we'll contact you to arrange payment" flow) or when the session could not be
 * created — the reservation itself must still succeed.
 */
export async function startBookingCheckout(
  admin: SupabaseClient,
  bookingId: string,
  origin: string,
): Promise<string | null> {
  const stripe = getStripe();
  if (!stripe) return null;

  try {
    const { data, error } = await admin
      .from('bookings')
      .select(
        'id, reference, access_token, customer_email, hold_expires_at, adults, children, seniors, addons, subtotal_cents, tax_cents, total_cents, packages(name, price_adult_cents, price_child_cents, price_senior_cents), departures(starts_at, tours(title, slug))',
      )
      .eq('id', bookingId)
      .maybeSingle();

    if (error || !data) return null;

    const booking = data as unknown as CheckoutBookingRow;
    const lines = buildCheckoutLines({
      reference: booking.reference,
      adults: booking.adults,
      children: booking.children,
      seniors: booking.seniors,
      addons: (booking.addons ?? []).map((addon) => ({
        name: addon.name,
        quantity: addon.quantity,
        unitCents: addon.unit_cents,
      })),
      subtotalCents: booking.subtotal_cents,
      taxCents: booking.tax_cents,
      totalCents: booking.total_cents,
      packageName: booking.packages?.name ?? null,
      adultCents: booking.packages?.price_adult_cents ?? null,
      childCents: booking.packages?.price_child_cents ?? null,
      seniorCents: booking.packages?.price_senior_cents ?? null,
    });

    const slug = booking.departures?.tours?.slug ?? null;
    const cancelPath = slug ? `/tours/${encodeURIComponent(slug)}#book` : '/#book';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'cad',
      line_items: lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: 'cad',
          unit_amount: line.unitCents,
          product_data: { name: line.label },
        },
      })),
      customer_email: booking.customer_email ?? undefined,
      client_reference_id: booking.id,
      metadata: { booking_id: booking.id },
      expires_at: checkoutExpiresAt(booking.hold_expires_at),
      success_url: `${origin}/booking/confirmed?ref=${encodeURIComponent(
        booking.reference,
      )}&t=${encodeURIComponent(booking.access_token)}`,
      cancel_url: `${origin}${cancelPath}`,
    });

    if (!session.url) return null;

    await admin
      .from('bookings')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', booking.id);

    return session.url;
  } catch (error) {
    // Never fail the reservation because Stripe is down: the booking stays
    // pending and the owner can arrange payment by phone or email.
    console.error('[stripe] Could not create a Checkout Session', error);
    return null;
  }
}
