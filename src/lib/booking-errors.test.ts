import { describe, expect, it } from 'vitest';

import {
  BOOKING_ERROR_MESSAGES,
  codeForActionError,
  codeForDbError,
  codeForMessage,
  messageForDbError,
  readErrorCode,
  type BookingErrorCode,
} from './booking-errors';

const dbErrors: ReadonlyArray<readonly [message: string, code: BookingErrorCode]> = [
  ['not_enough_seats', 'seats'],
  ['P0001: departure_not_found', 'departure'],
  ['departure_not_open', 'departure'],
  ['departure_in_past', 'departure'],
  ['package_not_available', 'package'],
  ['addon_not_available', 'addon'],
  ['invalid_addons', 'addon'],
  ['invalid_passenger_counts', 'people'],
  ['private_tour_inquiry_only', 'private'],
  ['an error nobody planned for', 'unknown'],
];

describe('codeForDbError', () => {
  it.each(dbErrors)('maps %s to %s', (message, code) => {
    expect(codeForDbError(message)).toBe(code);
  });

  it('reads the token when Postgres wraps the message', () => {
    expect(codeForDbError('reserve_booking: not enough seats: not_enough_seats')).toBe('seats');
  });
});

describe('messageForDbError', () => {
  it.each(dbErrors)('gives the message for %s', (message, code) => {
    expect(messageForDbError({ message })).toBe(BOOKING_ERROR_MESSAGES[code]);
  });

  it('has non-empty text for every code', () => {
    for (const code of Object.keys(BOOKING_ERROR_MESSAGES) as BookingErrorCode[]) {
      expect(BOOKING_ERROR_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });
});

describe('codeForMessage', () => {
  it.each(Object.entries(BOOKING_ERROR_MESSAGES))('round-trips the %s message', (code, message) => {
    expect(codeForMessage(message)).toBe(code);
  });

  it('falls back to unknown for text it did not produce', () => {
    expect(codeForMessage('Something else entirely')).toBe('unknown');
  });
});

describe('codeForActionError', () => {
  it('maps a validation failure to invalid', () => {
    // The endpoint checks `isInputError` first; this is the code/message path.
    expect(codeForActionError({ code: 'BAD_REQUEST', message: 'Anything' })).toBe('invalid');
  });

  it('maps a missing Supabase client to unavailable', () => {
    expect(
      codeForActionError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Bookings are not configured yet. Please call us to reserve your seats.',
      }),
    ).toBe('unavailable');
  });

  it('maps a database conflict through the message map', () => {
    expect(codeForActionError({ code: 'CONFLICT', message: BOOKING_ERROR_MESSAGES.seats })).toBe(
      'seats',
    );
  });

  it('falls back to unknown', () => {
    expect(codeForActionError({ code: 'INTERNAL_SERVER_ERROR', message: 'Boom' })).toBe('unknown');
  });
});

describe('readErrorCode', () => {
  it('reads a known code from a query string', () => {
    expect(readErrorCode('?error=seats')).toBe('seats');
    expect(readErrorCode('?error=addon&other=1')).toBe('addon');
  });

  it('ignores missing or unknown codes', () => {
    expect(readErrorCode('')).toBeNull();
    expect(readErrorCode('?error=')).toBeNull();
    expect(readErrorCode('?error=<script>')).toBeNull();
    expect(readErrorCode('?foo=seats')).toBeNull();
  });
});
