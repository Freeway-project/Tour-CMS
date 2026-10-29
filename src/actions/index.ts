import { ActionError, defineAction } from 'astro:actions';

import { messageForDbError } from '../lib/booking-errors';
import { sendInquiryEmails, sendManualBookingEmails } from '../lib/booking-emails';
import { getAdminClient } from '../lib/db/admin';
import { isStripeConfigured, startBookingCheckout } from '../lib/stripe';
import { bookingSchema, inquirySchema } from './schemas';

/**
 * Server actions for the booking flow.
 *
 * Prices are never taken from the browser: `reserve_booking` recomputes every
 * line from the database inside one transaction. The action only says who is
 * coming and which package, departure, pick-up and extras they picked.
 */

interface ReserveBookingRow {
  booking_id: string;
  reference: string;
  total_cents: number;
  hold_expires_at: string | null;
  access_token: string;
}

interface InquiryPackageRow {
  tour_id: string;
  name: string;
  pricing_mode: string;
  max_pax: number | null;
  is_active: boolean;
  tours: { title: string } | null;
}

export const server = {
  reserveBooking: defineAction({
    accept: 'form',
    input: bookingSchema,
    handler: async (input, context) => {
      // A bot filled the hidden field. Return a dead end without booking.
      if (input.honeypot) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'We could not process this request.',
        });
      }

      const admin = getAdminClient();
      if (!admin) {
        throw new ActionError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Bookings are not configured yet. Please call us to reserve your seats.',
        });
      }

      // Without Stripe the booking is paid by hand: it keeps its seats until the
      // owner confirms or cancels it, and the owner must hear about it at once.
      const stripeConfigured = isStripeConfigured();

      const { data, error } = await admin.rpc('reserve_booking', {
        p_departure_id: input.departureId,
        p_package_id: input.packageId,
        p_adults: input.adults,
        p_children: input.children,
        p_seniors: input.seniors,
        p_addons: input.addons.map((addon) => ({
          addon_id: addon.addonId,
          quantity: addon.quantity,
        })),
        p_pickup_location_id: input.pickupLocationId ?? null,
        p_customer_name: input.customerName,
        p_customer_email: input.customerEmail,
        p_customer_phone: input.customerPhone,
        p_notes: input.notes && input.notes.length > 0 ? input.notes : null,
        p_manual_payment: !stripeConfigured,
      });

      if (error) {
        throw new ActionError({ code: 'CONFLICT', message: messageForDbError(error) });
      }

      const booking = (data as unknown as ReserveBookingRow[] | null)?.[0];
      if (!booking) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'We could not reserve your seats. Please try again.',
        });
      }

      // With Stripe configured the caller sends the customer straight to the
      // hosted Checkout page. Without it the booking stays pending and the
      // confirmation page explains that we will arrange payment.
      const checkoutUrl = await startBookingCheckout(admin, booking.booking_id, context.url.origin);

      if (!stripeConfigured) {
        // The booking would otherwise sit `pending` with nobody told about it.
        // Failures are logged inside the email helper and never lose the booking.
        await sendManualBookingEmails(booking.booking_id, { origin: context.url.origin });
      }

      return {
        reference: booking.reference,
        accessToken: booking.access_token,
        checkoutUrl,
      };
    },
  }),

  createInquiry: defineAction({
    accept: 'form',
    input: inquirySchema,
    handler: async (input, context) => {
      if (input.honeypot) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'We could not process this request.',
        });
      }

      const admin = getAdminClient();
      if (!admin) {
        throw new ActionError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Inquiries are not configured yet. Please call us instead.',
        });
      }

      const { data, error } = await admin
        .from('packages')
        .select('tour_id, name, pricing_mode, max_pax, is_active, tours(title)')
        .eq('id', input.packageId)
        .maybeSingle();

      if (error) {
        throw new ActionError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'We could not send your inquiry. Please try again in a moment.',
        });
      }

      const pkg = data as unknown as InquiryPackageRow | null;
      if (!pkg || !pkg.is_active || pkg.pricing_mode !== 'per_group') {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'That vehicle is no longer available. Please choose another one.',
        });
      }

      if (pkg.max_pax === null || input.groupSize > pkg.max_pax) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: `That vehicle seats up to ${pkg.max_pax ?? 0} people. Please choose a bigger vehicle.`,
        });
      }

      const { error: insertError } = await admin.from('inquiries').insert({
        tour_id: pkg.tour_id,
        package_id: input.packageId,
        preferred_date: input.preferredDate,
        group_size: input.groupSize,
        customer_name: input.customerName,
        customer_email: input.customerEmail,
        customer_phone: input.customerPhone,
        message: input.message && input.message.length > 0 ? input.message : null,
      });

      if (insertError) {
        throw new ActionError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'We could not send your inquiry. Please try again in a moment.',
        });
      }

      // The owner alert and the customer acknowledgement are best-effort: the
      // inquiry is already saved, so email problems must not fail the request.
      await sendInquiryEmails(
        {
          tourTitle: pkg.tours?.title ?? 'Private Niagara Falls tour',
          packageName: pkg.name,
          preferredDate: input.preferredDate,
          groupSize: input.groupSize,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          message: input.message && input.message.length > 0 ? input.message : null,
        },
        context.url.origin,
      );

      return { ok: true };
    },
  }),
};
