import { describe, expect, it } from 'vitest';

import { inquirySchema, bookingSchema } from './schemas';

const validBooking = {
  departureId: '11111111-1111-4111-8111-111111111111',
  packageId: '22222222-2222-4222-8222-222222222222',
  pickupLocationId: '33333333-3333-4333-8333-333333333333',
  adults: 2,
  children: 1,
  seniors: 0,
  addons: [{ addonId: '44444444-4444-4444-8444-444444444444', quantity: 2 }],
  customerName: 'Alex Guest',
  customerEmail: 'alex@example.com',
  customerPhone: '416-555-0142',
  notes: 'One folding stroller, please.',
  honeypot: '',
};

describe('bookingSchema', () => {
  it('accepts a valid booking', () => {
    const result = bookingSchema.safeParse(validBooking);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.adults).toBe(2);
      expect(result.data.addons).toEqual([
        { addonId: '44444444-4444-4444-8444-444444444444', quantity: 2 },
      ]);
    }
  });

  it('accepts add-ons sent by a form as a JSON string', () => {
    const result = bookingSchema.safeParse({
      ...validBooking,
      addons: JSON.stringify([{ addonId: '44444444-4444-4444-8444-444444444444', quantity: 1 }]),
    });

    expect(result.success).toBe(true);
  });

  it('rejects a bad email address', () => {
    const result = bookingSchema.safeParse({ ...validBooking, customerEmail: 'not-an-email' });

    expect(result.success).toBe(false);
  });

  it('rejects a booking with no people', () => {
    const result = bookingSchema.safeParse({
      ...validBooking,
      adults: 0,
      children: 0,
      seniors: 0,
    });

    expect(result.success).toBe(false);
  });

  it('rejects eight adults', () => {
    const result = bookingSchema.safeParse({ ...validBooking, adults: 8 });

    expect(result.success).toBe(false);
  });

  it('rejects a package id that is not a uuid', () => {
    const result = bookingSchema.safeParse({ ...validBooking, packageId: 'package-day-tour' });

    expect(result.success).toBe(false);
  });
});

describe('inquirySchema', () => {
  it('accepts a valid private-tour inquiry', () => {
    const result = inquirySchema.safeParse({
      packageId: '22222222-2222-4222-8222-222222222222',
      preferredDate: '2999-06-01',
      groupSize: 4,
      customerName: 'Alex Guest',
      customerEmail: 'alex@example.com',
      customerPhone: '+1 (416) 555-0142',
      message: 'We would like to leave from downtown.',
      honeypot: '',
    });

    expect(result.success).toBe(true);
  });

  it('rejects a group of zero', () => {
    const result = inquirySchema.safeParse({
      packageId: '22222222-2222-4222-8222-222222222222',
      preferredDate: '2999-06-01',
      groupSize: 0,
      customerName: 'Alex Guest',
      customerEmail: 'alex@example.com',
      customerPhone: '416-555-0142',
      message: '',
      honeypot: '',
    });

    expect(result.success).toBe(false);
  });
});
