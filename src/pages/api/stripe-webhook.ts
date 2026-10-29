import type { APIRoute } from 'astro';
import { STRIPE_WEBHOOK_SECRET } from 'astro:env/server';
import Stripe from 'stripe';

import { sendBookingEmails, sendPaymentAttentionEmail } from '../../lib/booking-emails';
import { getAdminClient } from '../../lib/db/admin';
import { actionForStripeEvent, shouldExpire, type ExpireCandidate } from '../../lib/stripe-events';
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
  needs_attention: boolean;
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

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded' ||
    event.type === 'checkout.session.expired' ||
    event.type === 'checkout.session.async_payment_failed'
  ) {
    const session = event.data.object;
    const action = actionForStripeEvent(event.type, session.payment_status);

    if (action === 'mark_paid') {
      const bookingId = bookingIdFrom(session);

      if (bookingId) {
        const { data, error } = await admin.rpc('mark_booking_paid', {
          p_session_id: session.id,
          p_booking_id: bookingId,
        });

        if (error) {
          // Not handled: a 500 makes Stripe retry, so a paid booking is never
          // left pending because of a transient database error.
          console.error('[stripe] mark_booking_paid failed', error);
          return new Response('Could not record the payment', { status: 500 });
        }

        const result = (data as unknown as MarkPaidRow[] | null)?.[0] ?? null;

        // A payment for a cancelled or refunded booking cannot be applied, but
        // the money is real: the owner must decide whether to refund or
        // reinstate it.
        if (result?.needs_attention === true) {
          await sendPaymentAttentionEmail(bookingId, { origin });
        }

        // The emails are sent even when `changed` is false: a webhook retry must
        // still deliver anything the first attempt could not send.
        await sendBookingEmails(bookingId, {
          origin,
          overbooked: result?.overbooked === true,
        });
      }
    } else if (action === 'expire') {
      const bookingId = bookingIdFrom(session);

      if (bookingId) {
        const { data, error } = await admin
          .from('bookings')
          .select('status, stripe_checkout_session_id')
          .eq('id', bookingId)
          .maybeSingle();

        if (error) {
          console.error('[stripe] Could not read the booking before expiring it', error);
          return new Response('Could not expire the booking', { status: 500 });
        }

        const booking = data as unknown as ExpireCandidate | null;

        // Only the booking's current session may release its seats. An old
        // session that `/booking/pay` replaced must not expire a live booking.
        if (booking && shouldExpire(booking, session.id)) {
          // The session id is repeated in the filter so a session created
          // between the read and the write cannot be expired by the old one.
          const { error: updateError } = await admin
            .from('bookings')
            .update({ status: 'expired' })
            .eq('id', bookingId)
            .eq('status', 'pending')
            .eq('stripe_checkout_session_id', session.id);

          if (updateError) {
            console.error('[stripe] Could not expire the booking', updateError);
            return new Response('Could not expire the booking', { status: 500 });
          }
        }
      }
    } else if (event.type === 'checkout.session.async_payment_failed') {
      // No booking change: the session is unpaid, so it stays pending until the
      // hold expires. Logged so a failed delayed payment is not invisible.
      console.warn('[stripe] Async payment failed', session.id);
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
