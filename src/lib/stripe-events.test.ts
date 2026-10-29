import { describe, expect, it } from 'vitest';

import { actionForStripeEvent, shouldExpire } from './stripe-events';

describe('shouldExpire', () => {
  const pending = { status: 'pending', stripe_checkout_session_id: 'cs_new' };

  it('expires the booking when the event is its current session', () => {
    expect(shouldExpire(pending, 'cs_new')).toBe(true);
  });

  it('ignores an old session that the booking no longer points at', () => {
    expect(shouldExpire(pending, 'cs_old')).toBe(false);
  });

  it('ignores a booking that is no longer pending', () => {
    expect(shouldExpire({ ...pending, status: 'paid' }, 'cs_new')).toBe(false);
    expect(shouldExpire({ ...pending, status: 'cancelled' }, 'cs_new')).toBe(false);
    expect(shouldExpire({ ...pending, status: 'expired' }, 'cs_new')).toBe(false);
  });

  it('ignores a booking with no stored session id', () => {
    expect(shouldExpire({ ...pending, stripe_checkout_session_id: null }, 'cs_new')).toBe(false);
  });
});

describe('actionForStripeEvent', () => {
  it('marks a booking paid only when Stripe says the session is paid', () => {
    expect(actionForStripeEvent('checkout.session.completed', 'paid')).toBe('mark_paid');
    expect(actionForStripeEvent('checkout.session.async_payment_succeeded', 'paid')).toBe(
      'mark_paid',
    );
  });

  it('ignores a completed session that is not paid yet', () => {
    expect(actionForStripeEvent('checkout.session.completed', 'unpaid')).toBe('ignore');
    expect(actionForStripeEvent('checkout.session.completed', 'no_payment_required')).toBe(
      'ignore',
    );
    expect(actionForStripeEvent('checkout.session.async_payment_succeeded', 'unpaid')).toBe(
      'ignore',
    );
    expect(actionForStripeEvent('checkout.session.completed', null)).toBe('ignore');
  });

  it('expires only on the expired event', () => {
    expect(actionForStripeEvent('checkout.session.expired', 'unpaid')).toBe('expire');
  });

  it('ignores a failed async payment and unknown events', () => {
    expect(actionForStripeEvent('checkout.session.async_payment_failed', 'unpaid')).toBe('ignore');
    expect(actionForStripeEvent('payment_intent.succeeded', 'paid')).toBe('ignore');
  });
});
