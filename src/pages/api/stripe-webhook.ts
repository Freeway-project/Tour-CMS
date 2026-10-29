import type { APIRoute } from 'astro';
import { STRIPE_WEBHOOK_SECRET } from 'astro:env/server';
import Stripe from 'stripe';

import { sendBookingEmails } from '../../lib/booking-emails';
import { getAdminClient } from '../../lib/db/admin';
import { getStripe } from '../../lib/stripe';

/**
 * Stripe webhook.
 *
 * `checkOrigin` is left on for the whole site and this route needs no
 * exception: Astro only rejects a POST with a form-like content type
 * (`application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`)
 * when the Origin header does not match. Stripe sends `application/json`, so
 * the origin check does not apply to it (and our own forms stay protected).
 *
 * The signature is verified against the raw body with the WebCrypto provider,
 * which is what runs on Cloudflare Workers.
 */

export const prerender = false;

interface MarkPaidRow {
  changed: boolean;
  overbooked: boolean;
}

function bookingIdFrom(session: Stripe.Checkout.Session): string {
  return session.metadata?.booking_id ?? session.client_reference_id ?? '';
}

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  const secret = STRIPE_WEBHOOK_SECRET;
  const admin = getAdminClient();

  if (!stripe || !secret || !admin) {
    return new Response('Stripe is not configured', { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing Stripe-Signature', { status: 400 });

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      secret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    console.error('[stripe] Webhook signature verification failed', error);
    return new Response('Invalid signature', { status: 400 });
  }

  const origin = new URL(request.url).origin;

  if (event.type === 'checkout.session.completed') {
    const bookingId = bookingIdFrom(event.data.object);

    if (bookingId) {
      const { data, error } = await admin.rpc('mark_booking_paid', {
        p_session_id: event.data.object.id,
        p_booking_id: bookingId,
      });

      if (error) {
        // Not handled: a 500 makes Stripe retry, so a paid booking is never
        // left pending because of a transient database error.
        console.error('[stripe] mark_booking_paid failed', error);
        return new Response('Could not record the payment', { status: 500 });
      }

      const result = (data as unknown as MarkPaidRow[] | null)?.[0] ?? null;

      // The emails are sent even when `changed` is false: a webhook retry must
      // still deliver anything the first attempt could not send.
      await sendBookingEmails(bookingId, {
        origin,
        overbooked: result?.overbooked === true,
      });
    }
  } else if (event.type === 'checkout.session.expired') {
    const bookingId = bookingIdFrom(event.data.object);

    if (bookingId) {
      const { error } = await admin
        .from('bookings')
        .update({ status: 'expired' })
        .eq('id', bookingId)
        .eq('status', 'pending');

      if (error) {
        console.error('[stripe] Could not expire the booking', error);
        return new Response('Could not expire the booking', { status: 500 });
      }
    }
  }

  // Handled and ignored events both answer 200 so Stripe stops retrying.
  return new Response(null, { status: 200 });
};

export const ALL: APIRoute = () =>
  new Response('Method Not Allowed', {
    status: 405,
    headers: { allow: 'POST', 'content-type': 'text/plain; charset=utf-8' },
  });
