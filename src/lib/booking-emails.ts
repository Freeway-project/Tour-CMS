import type { SupabaseClient } from '@supabase/supabase-js';

import { getAdminClient } from './db/admin';
import { getSiteSettings } from './db/content';
import { sendEmail } from './email/send';
import {
  customerBookingConfirmation,
  customerBookingRequestReceived,
  customerInquiryReceived,
  ownerBookingAlert,
  ownerBookingPaymentNeeded,
  ownerInquiryAlert,
  ownerPaymentNeedsAttention,
  type BookingEmailData,
  type InquiryEmailData,
} from './email/templates';
import { notifyOwner } from './notify';
import type { SiteSettings } from './types';

/**
 * Builds and sends the booking and inquiry emails.
 *
 * The `*_email_sent_at` columns make the Stripe webhook idempotent: a retry
 * skips the email that already went out. Every failure is logged and swallowed
 * — a payment or a reservation is never lost because email is down.
 */

interface BookingEmailRow {
  id: string;
  reference: string;
  access_token: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  notes: string | null;
  status: string;
  adults: number;
  children: number;
  seniors: number;
  addons: Array<{ name: string; quantity: number; unit_cents: number }> | null;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  pickup_location_id: string | null;
  confirmation_email_sent_at: string | null;
  owner_email_sent_at: string | null;
  departures: {
    tour_id: string;
    starts_at: string;
    tours: { title: string; slug: string } | null;
  } | null;
  packages: { name: string } | null;
  pickup_locations: { name: string; address: string } | null;
}

type SentColumn = 'confirmation_email_sent_at' | 'owner_email_sent_at';

async function markSent(
  admin: SupabaseClient,
  bookingId: string,
  column: SentColumn,
): Promise<void> {
  const value = new Date().toISOString();
  const patch =
    column === 'confirmation_email_sent_at'
      ? { confirmation_email_sent_at: value }
      : { owner_email_sent_at: value };

  const { error } = await admin.from('bookings').update(patch).eq('id', bookingId);
  if (error) console.error(`[email] Could not record ${column}`, error);
}

/** `tour_pickups.pickup_time` is a Postgres `time`; emails show `07:45`. */
async function pickupTimeFor(
  admin: SupabaseClient,
  tourId: string | null,
  pickupLocationId: string | null,
): Promise<string | null> {
  if (!tourId || !pickupLocationId) return null;

  const { data } = await admin
    .from('tour_pickups')
    .select('pickup_time')
    .eq('tour_id', tourId)
    .eq('pickup_location_id', pickupLocationId)
    .maybeSingle();

  const time = (data as unknown as { pickup_time: string } | null)?.pickup_time;
  return time ? time.slice(0, 5) : null;
}

function bookingEmailData(
  row: BookingEmailRow,
  settings: SiteSettings,
  pickupTime: string | null,
  origin: string,
  overbooked: boolean,
): BookingEmailData {
  return {
    settings,
    reference: row.reference,
    customerName: row.customer_name ?? 'there',
    customerEmail: row.customer_email ?? '',
    customerPhone: row.customer_phone,
    notes: row.notes,
    tourTitle: row.departures?.tours?.title ?? 'Niagara Falls tour',
    packageName: row.packages?.name ?? 'Tour',
    startsAt: row.departures?.starts_at ?? '',
    adults: row.adults,
    children: row.children,
    seniors: row.seniors,
    pickupName: row.pickup_locations?.name ?? null,
    pickupAddress: row.pickup_locations?.address ?? null,
    pickupTime,
    addons: (row.addons ?? []).map((addon) => ({
      name: addon.name,
      quantity: addon.quantity,
      unitCents: addon.unit_cents,
    })),
    subtotalCents: row.subtotal_cents,
    taxCents: row.tax_cents,
    totalCents: row.total_cents,
    bookingUrl: `${origin}/booking/confirmed?ref=${encodeURIComponent(
      row.reference,
    )}&t=${encodeURIComponent(row.access_token)}`,
    adminUrl: `${origin}/admin/bookings/${row.id}`,
    overbooked,
  };
}

/** One query shape for every booking email, so the fields cannot drift apart. */
async function loadBookingEmailRow(
  admin: SupabaseClient,
  bookingId: string,
): Promise<BookingEmailRow | null> {
  const { data, error } = await admin
    .from('bookings')
    .select(
      'id, reference, access_token, customer_name, customer_email, customer_phone, notes, status, adults, children, seniors, addons, subtotal_cents, tax_cents, total_cents, pickup_location_id, confirmation_email_sent_at, owner_email_sent_at, departures(tour_id, starts_at, tours(title, slug)), packages(name), pickup_locations(name, address)',
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as BookingEmailRow;
}

/**
 * Sends the customer confirmation and the owner alert for a paid booking.
 * Safe to call twice: already-sent emails are skipped.
 */
export async function sendBookingEmails(
  bookingId: string,
  options: { origin: string; overbooked?: boolean },
): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;

  try {
    const row = await loadBookingEmailRow(admin, bookingId);
    if (!row || !row.departures) return;

    // Only a paid booking gets a confirmation. A cancelled or refunded booking
    // that somehow reaches the webhook must not tell the customer they are booked.
    if (row.status !== 'paid') return;

    const settings = await getSiteSettings(admin);
    const pickupTime = await pickupTimeFor(admin, row.departures.tour_id, row.pickup_location_id);
    const emailData = bookingEmailData(
      row,
      settings,
      pickupTime,
      options.origin,
      options.overbooked === true,
    );

    if (!row.confirmation_email_sent_at && row.customer_email) {
      const content = customerBookingConfirmation(emailData);
      const sent = await sendEmail({ to: row.customer_email, ...content });
      if (sent) await markSent(admin, bookingId, 'confirmation_email_sent_at');
    }

    if (!row.owner_email_sent_at) {
      const content = ownerBookingAlert(emailData);
      const sent = await notifyOwner({
        text: content.text,
        email: { to: settings.email, ...content },
      });
      if (sent) await markSent(admin, bookingId, 'owner_email_sent_at');
    }
  } catch (error) {
    console.error('[email] Could not send the booking emails', error);
  }
}

/**
 * Emails for a booking that needs payment arranged by hand (Stripe is not
 * configured). The owner gets a `PAYMENT NEEDED` alert and the customer gets a
 * "we've received your booking request" acknowledgement.
 *
 * The `*_sent_at` columns make this idempotent, exactly like the paid emails.
 */
export async function sendManualBookingEmails(
  bookingId: string,
  options: { origin: string },
): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;

  try {
    const row = await loadBookingEmailRow(admin, bookingId);
    if (!row || !row.departures) return;

    // A manual booking must still be waiting for payment when these go out.
    if (row.status !== 'pending') return;

    const settings = await getSiteSettings(admin);
    const pickupTime = await pickupTimeFor(admin, row.departures.tour_id, row.pickup_location_id);
    const emailData = bookingEmailData(row, settings, pickupTime, options.origin, false);

    if (!row.confirmation_email_sent_at && row.customer_email) {
      const content = customerBookingRequestReceived(emailData);
      const sent = await sendEmail({ to: row.customer_email, ...content });
      if (sent) await markSent(admin, bookingId, 'confirmation_email_sent_at');
    }

    if (!row.owner_email_sent_at) {
      const content = ownerBookingPaymentNeeded(emailData);
      const sent = await notifyOwner({
        text: content.text,
        email: { to: settings.email, ...content },
      });
      if (sent) await markSent(admin, bookingId, 'owner_email_sent_at');
    }
  } catch (error) {
    console.error('[email] Could not send the manual booking emails', error);
  }
}

/**
 * Alerts the owner that a payment arrived for a cancelled or refunded booking.
 * The booking cannot be changed automatically, so a human has to refund or
 * reinstate it.
 */
export async function sendPaymentAttentionEmail(
  bookingId: string,
  options: { origin: string },
): Promise<void> {
  const admin = getAdminClient();
  if (!admin) return;

  try {
    const { data, error } = await admin
      .from('bookings')
      .select('reference')
      .eq('id', bookingId)
      .maybeSingle();

    if (error || !data) return;

    const reference = (data as unknown as { reference: string }).reference;
    const settings = await getSiteSettings(admin);
    const content = ownerPaymentNeedsAttention({
      settings,
      reference,
      adminUrl: `${options.origin}/admin/bookings/${bookingId}`,
    });

    await notifyOwner({ text: content.text, email: { to: settings.email, ...content } });
  } catch (error) {
    console.error('[email] Could not send the payment attention alert', error);
  }
}

export interface InquiryEmailInput {
  tourTitle: string;
  packageName: string;
  preferredDate: string;
  groupSize: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  message: string | null;
}

/** Owner alert plus customer acknowledgement for a private-tour request. */
export async function sendInquiryEmails(input: InquiryEmailInput, origin: string): Promise<void> {
  try {
    const settings = await getSiteSettings(getAdminClient());
    const data: InquiryEmailData = {
      settings,
      tourTitle: input.tourTitle,
      packageName: input.packageName,
      preferredDate: input.preferredDate,
      groupSize: input.groupSize,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      message: input.message,
      adminUrl: `${origin}/admin/inquiries`,
    };

    const owner = ownerInquiryAlert(data);
    await notifyOwner({ text: owner.text, email: { to: settings.email, ...owner } });

    const customer = customerInquiryReceived(data);
    await sendEmail({ to: input.customerEmail, ...customer });
  } catch (error) {
    console.error('[email] Could not send the inquiry emails', error);
  }
}
