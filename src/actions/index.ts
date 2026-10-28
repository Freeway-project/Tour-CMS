import { ActionError, defineAction } from 'astro:actions';

import { messageForDbError } from '../lib/booking-errors';
import { getAdminClient } from '../lib/db/admin';
import { bookingSchema, inquirySchema } from './schemas';

/**
 * Server actions for the booking flow.
 *
 * Prices are never taken from the browser: `reserve_booking` recomputes every
 * line from the database inside one transaction. The action only says who is
 * coming and which package, departure, pick-up and extras they picked.
 */

interface ReserveBookingRow {
  reference: string;
  total_cents: number;
}

interface InquiryPackageRow {
  tour_id: string;
  pricing_mode: string;
  max_pax: number | null;
  is_active: boolean;
}

export const server = {
  reserveBooking: defineAction({
    accept: 'form',
    input: bookingSchema,
    handler: async (input) => {
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

      // The caller redirects to `/booking/confirmed?ref=<reference>`.
      return { reference: booking.reference };
    },
  }),

  createInquiry: defineAction({
    accept: 'form',
    input: inquirySchema,
    handler: async (input) => {
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
        .select('tour_id, pricing_mode, max_pax, is_active')
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

      return { ok: true };
    },
  }),
};
