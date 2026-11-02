import { z } from 'astro/zod';

import { dollarsToCents } from './money';
import { slugify } from './slug';

/**
 * Shared zod schemas for admin forms. Every admin write should validate with
 * one of these before touching the database. Form data arrives as strings (or
 * null for empty inputs), so the helpers normalise both.
 */

const requiredText = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === null || value === undefined ? '' : value),
    z.string().trim().min(min).max(max),
  );

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === null || value === undefined || value === '' ? undefined : value),
    z.string().trim().max(max).optional(),
  );

const email = z.preprocess(
  (value) => (value === null || value === undefined ? '' : value),
  z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
);

const optionalUrl = z.preprocess(
  (value) => (value === null || value === undefined || value === '' ? null : value),
  z.string().trim().url('Enter a valid URL').max(2048).nullable().optional(),
);

const rating = z.preprocess(
  (value) => (value === null || value === undefined || value === '' ? NaN : value),
  z.number().int().min(1, 'Rating must be 1-5').max(5, 'Rating must be 1-5'),
);

const dollars = (minCents = 0) =>
  z.preprocess((value) => (value === null || value === undefined ? '' : value), z.string()).transform(
    (value, ctx) => {
      try {
        const cents = dollarsToCents(value);
        if (cents < minCents) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Price is too low' });
          return z.NEVER;
        }
        return cents;
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid price' });
        return z.NEVER;
      }
    },
  );

const integerString = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === null || value === undefined ? '' : value),
    z
      .string()
      .trim()
      .regex(/^\d+$/, 'Enter a whole number')
      .transform((v) => Number(v))
      .pipe(z.number().int().min(min).max(max)),
  );

const boolFromCheckbox = z.preprocess(
  (value) => value === 'on' || value === true || value === 'true' || value === 1 || value === '1',
  z.boolean(),
);

const stringArray = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return value
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return value;
}, z.array(z.string().trim().min(1).max(200)).max(50));

export const siteSettingsSchema = z.object({
  name: requiredText(1, 120),
  tagline: requiredText(1, 200),
  phone: requiredText(5, 40),
  whatsapp: requiredText(5, 40),
  email,
  address: requiredText(1, 300),
  hst_number: optionalText(40),
  cancellation_policy: requiredText(1, 4000),
  // Legal pages run long; empty means "not written yet" and hides the page.
  privacy_policy: optionalText(20000),
  terms: optionalText(20000),
  guide_name: optionalText(80),
  guide_bio: optionalText(2000),
  vehicle_text: optionalText(1000),
  announcement_enabled: boolFromCheckbox.default(false),
  announcement_text: optionalText(300),
  announcement_href: optionalUrl,
});

export const faqSchema = z.object({
  question: requiredText(3, 200),
  answer: requiredText(3, 4000),
  tour_id: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? null : v),
    z.string().uuid().nullable().optional(),
  ),
  sort_order: integerString(0, 10000).default(0),
  is_active: boolFromCheckbox.default(true),
});

export const reviewSchema = z.object({
  author: requiredText(1, 120),
  location: optionalText(120),
  rating,
  text: requiredText(3, 2000),
  review_date: z.preprocess(
    (v) => (v === null || v === undefined ? '' : v),
    z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date'),
  ),
  source: z.enum(['google', 'tripadvisor', 'viator', 'direct']).default('direct'),
  tour_id: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? null : v),
    z.string().uuid().nullable().optional(),
  ),
  featured: boolFromCheckbox.default(false),
  is_active: boolFromCheckbox.default(true),
});

const optionalInteger = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === null || value === undefined || value === '' ? undefined : value),
    z
      .string()
      .trim()
      .regex(/^\d+$/, 'Enter a whole number')
      .transform((v) => Number(v))
      .pipe(z.number().int().min(min).max(max))
      .optional(),
  );

/**
 * The timed day, one stop per line: `08:00 | Pickup at York St | optional detail`.
 * Blank lines are ignored; order is kept as typed.
 */
export const itineraryText = z
  .preprocess((value) => (typeof value === 'string' ? value : ''), z.string())
  .transform((value, ctx) => {
    const stops: Array<{ time: string; title: string; detail: string | null }> = [];
    const lines = value.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.trim() === '') return;
      const [time = '', title = '', ...rest] = line.split('|').map((part) => part.trim());
      const detail = rest.join(' | ').trim();
      const match = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/.exec(time);
      if (!match || title.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Line ${index + 1}: write it as "08:00 | What happens | optional detail"`,
        });
        return;
      }
      if (title.length > 120 || detail.length > 300) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Line ${index + 1} is too long` });
        return;
      }
      stops.push({ time: `${match[1]!.padStart(2, '0')}:${match[2]}`, title, detail: detail || null });
    });
    if (stops.length > 20) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Keep the day to 20 stops or fewer' });
    }
    return stops;
  });

/** Turns stored stops back into the one-per-line admin text. */
export function itineraryToText(stops: ReadonlyArray<{ time: string; title: string; detail: string | null }>): string {
  return stops.map((stop) => [stop.time, stop.title, stop.detail ?? ''].filter(Boolean).join(' | ')).join('\n');
}

export const tourSchema = z.object({
  title: requiredText(2, 160),
  slug: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? undefined : v),
    z.string().trim().min(2).max(160).regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers and hyphens').optional(),
  ),
  short_description: requiredText(2, 300),
  description: requiredText(2, 8000),
  highlights: stringArray,
  excludes: stringArray,
  itinerary: itineraryText,
  max_guests: optionalInteger(1, 100),
  important_info: optionalText(4000),
  duration_hours: integerString(0, 24).default(0),
  duration_minutes_extra: integerString(0, 59).default(0),
  status: z.enum(['active', 'seasonal', 'hidden']).default('active'),
  is_private: boolFromCheckbox.default(false),
  sort_order: integerString(0, 10000).default(0),
});

export const packageSchema = z.object({
  name: requiredText(2, 120),
  description: optionalText(500),
  includes: stringArray,
  pricing_mode: z.enum(['per_person', 'per_group']),
  price_adult_cents: dollars(0),
  price_child_cents: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? null : v),
    dollars(0).nullable().optional(),
  ),
  price_senior_cents: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? null : v),
    dollars(0).nullable().optional(),
  ),
  max_pax: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? null : v),
    integerString(1, 100).nullable().optional(),
  ),
  is_active: boolFromCheckbox.default(true),
  sort_order: integerString(0, 10000).default(0),
});

export const addonSchema = z.object({
  name: requiredText(2, 120),
  description: optionalText(500),
  price_cents: dollars(0),
  pricing: z.enum(['per_person', 'per_booking']).default('per_person'),
  is_active: boolFromCheckbox.default(true),
  sort_order: integerString(0, 10000).default(0),
});

export const pickupLocationSchema = z.object({
  name: requiredText(2, 120),
  address: requiredText(2, 300),
  lat: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? null : v),
    z.coerce.number().min(-90).max(90).nullable().optional(),
  ),
  lng: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? null : v),
    z.coerce.number().min(-180).max(180).nullable().optional(),
  ),
  pickup_note: optionalText(300),
  is_active: boolFromCheckbox.default(true),
});

export const pickupTimeSchema = z.object({
  tour_id: z.string().uuid(),
  pickup_location_id: z.string().uuid(),
  pickup_time: z.preprocess(
    (v) => (v === null || v === undefined ? '' : v),
    z.string().trim().regex(/^\d{2}:\d{2}$/, 'Enter a time (HH:MM)'),
  ),
});

export const scheduleSchema = z.object({
  tour_id: z.string().uuid(),
  weekdays: z.preprocess(
    (v) => {
      if (Array.isArray(v)) return v.map(Number);
      if (typeof v === 'string') {
        return v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map(Number);
      }
      return [];
    },
    z.array(z.number().int().min(0).max(6)).min(1, 'Pick at least one weekday'),
  ),
  start_time: z.preprocess(
    (v) => (v === null || v === undefined ? '' : v),
    z.string().trim().regex(/^\d{2}:\d{2}$/, 'Enter a time (HH:MM)'),
  ),
  capacity: integerString(1, 1000),
  valid_from: z.preprocess(
    (v) => (v === null || v === undefined ? '' : v),
    z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date'),
  ),
  valid_to: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? null : v),
    z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date').nullable().optional(),
  ),
  is_active: boolFromCheckbox.default(true),
});

export const blackoutDateSchema = z.object({
  tour_id: z.preprocess(
    (v) => (v === null || v === undefined || v === '' ? null : v),
    z.string().uuid().nullable().optional(),
  ),
  date: z.preprocess(
    (v) => (v === null || v === undefined ? '' : v),
    z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date'),
  ),
  reason: optionalText(200),
});

export const departureCapacitySchema = z.object({
  id: z.string().uuid(),
  capacity: integerString(1, 1000),
});

export const oneOffDepartureSchema = z.object({
  tour_id: z.string().uuid(),
  starts_at: z.preprocess(
    (v) => (v === null || v === undefined ? '' : v),
    z.string().trim().min(1, 'Enter a date and time'),
  ),
  capacity: integerString(1, 1000),
});

export const bookingNotesSchema = z.object({
  id: z.string().uuid(),
  notes: optionalText(1000),
});

export const imageAltSchema = z.object({
  alt: requiredText(3, 200),
});

export function slugFromTitle(title: string): string {
  return slugify(title);
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}