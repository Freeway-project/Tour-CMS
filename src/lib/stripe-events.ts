/**
 * Pure decisions for the Stripe webhook.
 *
 * The route keeps the I/O (signature check, database, email); the rules about
 * which event may change which booking live here so they can be unit-tested
 * without Stripe or Supabase.
 */

export type StripeWebhookAction = 'mark_paid' | 'expire' | 'ignore';

/** The two booking fields `shouldExpire` needs. */
export interface ExpireCandidate {
  status: string;
  stripe_checkout_session_id: string | null;
}

/**
 * A `checkout.session.expired` event may only expire the booking whose *current*
 * Checkout session it is.
 *
 * `/booking/pay` creates a new session for a booking whose first session was
 * abandoned and stores its id on the booking. When the old session later
 * expires, the id no longer matches and the customer — who may be paying on the
 * new session — keeps their seats.
 */
export function shouldExpire(booking: ExpireCandidate, sessionId: string): boolean {
  return booking.status === 'pending' && booking.stripe_checkout_session_id === sessionId;
}

/**
 * Maps a Stripe event to what the webhook should do.
 *
 * A booking is only marked paid when Stripe reports the session as `paid`.
 * `checkout.session.completed` can arrive with `payment_status = 'unpaid'` for
 * delayed payment methods; the later `async_payment_succeeded` event carries
 * the real result. `async_payment_failed` is logged by the route and ignored.
 */
export function actionForStripeEvent(
  eventType: string,
  paymentStatus: string | null | undefined,
): StripeWebhookAction {
  if (
    eventType === 'checkout.session.completed' ||
    eventType === 'checkout.session.async_payment_succeeded'
  ) {
    return paymentStatus === 'paid' ? 'mark_paid' : 'ignore';
  }

  if (eventType === 'checkout.session.expired') return 'expire';

  return 'ignore';
}
