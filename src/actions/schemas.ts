import { z } from 'astro/zod';

import { isIsoDate, todayInToronto } from '../lib/datetime';

/**
 * Input schemas for the booking and inquiry actions.
 *
 * They are kept in their own module so the rules can be unit-tested without
 * booting Astro. Form data arrives as strings (or `null` for empty inputs),
 * JSON callers send real numbers, so the helpers normalise both.
 */

export const MAX_PEOPLE_PER_TYPE = 7;
export const MAX_ADDON_QUANTITY = 20;
export const MAX_ADDONS = 20;

const requiredText = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === null || value === undefined ? '' : value),
    z.string().trim().min(min).max(max),
  );

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === null || value === undefined ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const email = z.preprocess(
  (value) => (value === null || value === undefined ? '' : value),
  z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
);

// Accepts spaces, brackets and dashes as well as plain digits.
const phone = z.preprocess(
  (value) => (value === null || value === undefined ? '' : value),
  z
    .string()
    .trim()
    .min(7, 'Enter a phone number we can reach you on')
    .max(20, 'That phone number is too long')
    .regex(/^[0-9+().\-\s]+$/, 'Enter a valid phone number'),
);

const peopleCount = z.number().int().min(0).max(MAX_PEOPLE_PER_TYPE);

const addonItem = z.object({
  addonId: z.string().uuid(),
  quantity: z.number().int().min(0).max(MAX_ADDON_QUANTITY),
});

/** Form submissions send the add-ons as one JSON string in a hidden input. */
const addonsField = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') return [];
  if (typeof value !== 'string') return value;

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}, z.array(addonItem).max(MAX_ADDONS).default([]));

const honeypot = z.preprocess(
  (value) => (value === null || value === undefined ? '' : value),
  z.string().max(200),
);

export const bookingSchema = z
  .object({
    departureId: z.string().uuid('Choose a departure'),
    packageId: z.string().uuid('Choose a package'),
    pickupLocationId: z.preprocess(
      (value) => (value === null || value === '' ? undefined : value),
      z.string().uuid('Choose a pickup location').optional(),
    ),
    adults: peopleCount.default(0),
    children: peopleCount.default(0),
    seniors: peopleCount.default(0),
    addons: addonsField,
    customerName: requiredText(2, 80),
    customerEmail: email,
    customerPhone: phone,
    notes: optionalText(500),
    honeypot,
  })
  .refine((value) => value.adults + value.children + value.seniors >= 1, {
    message: 'Choose at least one person',
    path: ['adults'],
  });

export const inquirySchema = z.object({
  packageId: z.string().uuid('Choose a vehicle'),
  preferredDate: z.preprocess(
    (value) => (value === null || value === undefined ? '' : value),
    z
      .string()
      .trim()
      .refine(isIsoDate, 'Choose a valid date')
      .refine((value) => value >= todayInToronto(), 'Choose a future date'),
  ),
  groupSize: z.number().int().min(1, 'Choose at least one person').max(11, 'Groups are up to 11'),
  customerName: requiredText(2, 80),
  customerEmail: email,
  customerPhone: phone,
  message: optionalText(1000),
  honeypot,
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type InquiryInput = z.infer<typeof inquirySchema>;
