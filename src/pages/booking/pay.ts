import type { APIRoute } from 'astro';

import { methodNotAllowed, redirect } from '../../lib/booking-http';
import { getAdminClient } from '../../lib/db/admin';
import { startBookingCheckout } from '../../lib/stripe';
import { tokensMatch } from '../../lib/tokens';

/**
 * "Complete payment" on `/booking/confirmed`.
 *
 * A plain form POST so it works without JavaScript. The reference and private
 * token are checked exactly as on the confirmation page, and a new Checkout
 * Session is only created while the hold is still valid.
 */

export const prerender = false;

interface PendingBookingRow {
  id: string;
  access_token: string;
  status: string;
  hold_expires_at: string | null;
}

export const POST: APIRoute = async ({ request }) => {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return new Response('Bad Request', {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const reference = String(formData.get('ref') ?? '').trim();
  const token = String(formData.get('t') ?? '').trim();

  // No reference/token means there is no private booking to show.
  if (!reference || !token) return redirect('/booking/confirmed');

  const backUrl = `/booking/confirmed?ref=${encodeURIComponent(reference)}&t=${encodeURIComponent(
    token,
  )}`;

  const admin = getAdminClient();
  if (!admin) return redirect(backUrl);

  const { data, error } = await admin
    .from('bookings')
    .select('id, access_token, status, hold_expires_at')
    .eq('reference', reference)
    .maybeSingle();

  const booking = data as unknown as PendingBookingRow | null;

  if (error || !booking || !tokensMatch(booking.access_token, token)) {
    return redirect('/booking/confirmed');
  }

  const holdValid =
    booking.hold_expires_at !== null && new Date(booking.hold_expires_at).getTime() > Date.now();

  if (booking.status !== 'pending' || !holdValid) return redirect(backUrl);

  const checkoutUrl = await startBookingCheckout(admin, booking.id, new URL(request.url).origin);

  return redirect(checkoutUrl ?? backUrl);
};

export const ALL: APIRoute = () => methodNotAllowed();
