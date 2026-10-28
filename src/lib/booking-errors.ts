/**
 * Booking and inquiry error codes, with one friendly message per code.
 *
 * The enhanced forms show the action's message directly. The no-JavaScript
 * endpoints in `src/pages/booking/` cannot, so they redirect back to the tour
 * page with a short code (`?error=seats`) and the widget script looks the
 * message up here. Everything lives in one map so the two paths can never
 * drift apart.
 *
 * The module is isomorphic: it is imported by server actions, server
 * endpoints and the browser widget, so it must stay dependency-free.
 */

export type BookingErrorCode =
  | 'seats'
  | 'departure'
  | 'package'
  | 'addon'
  | 'people'
  | 'private'
  | 'invalid'
  | 'unavailable'
  | 'unknown';

export const BOOKING_ERROR_MESSAGES: Record<BookingErrorCode, string> = {
  seats: 'There are not enough seats left for that date. Please choose another departure.',
  departure: 'That departure is no longer available. Please choose another date.',
  package: 'That package is no longer available. Please refresh the page and try again.',
  addon: 'One of those extras is no longer available. Please refresh the page and try again.',
  people: 'Please choose at least one person.',
  private: 'Private tours are booked by inquiry. Please send us an inquiry instead.',
  invalid: 'Please check the details you entered and try again.',
  unavailable: 'Online booking is unavailable right now. Please call us and we will help.',
  unknown: 'We could not complete your booking. Please try again, or call us and we will help.',
};

/**
 * Error tokens raised by `reserve_booking` (and the inquiry checks). Matching
 * is a substring test because Postgres wraps them (`P0001: not_enough_seats`).
 */
const DB_ERROR_CODES: ReadonlyArray<readonly [token: string, code: BookingErrorCode]> = [
  ['not_enough_seats', 'seats'],
  ['departure_not_found', 'departure'],
  ['departure_not_open', 'departure'],
  ['departure_in_past', 'departure'],
  ['package_not_available', 'package'],
  ['addon_not_available', 'addon'],
  ['invalid_addons', 'addon'],
  ['invalid_passenger_counts', 'people'],
  ['private_tour_inquiry_only', 'private'],
];

/** Maps a database error message to the code the tour page understands. */
export function codeForDbError(message: string): BookingErrorCode {
  for (const [token, code] of DB_ERROR_CODES) {
    if (message.includes(token)) return code;
  }

  return 'unknown';
}

/** The customer-facing text for a database error. */
export function messageForDbError(error: { message: string }): string {
  return messageForCode(codeForDbError(error.message));
}

export function messageForCode(code: BookingErrorCode): string {
  return BOOKING_ERROR_MESSAGES[code];
}

/** Recovers the code from a message produced by this module. */
export function codeForMessage(message: string): BookingErrorCode {
  for (const code of Object.keys(BOOKING_ERROR_MESSAGES) as BookingErrorCode[]) {
    if (BOOKING_ERROR_MESSAGES[code] === message) return code;
  }

  return 'unknown';
}

/**
 * Codes an action error for the redirect. Validation failures and honeypot
 * hits are `invalid`, a missing Supabase client is `unavailable`, and anything
 * else falls back to the message map (which covers the database conflicts).
 */
export function codeForActionError(error: { code: string; message: string }): BookingErrorCode {
  if (error.code === 'SERVICE_UNAVAILABLE') return 'unavailable';
  if (error.code === 'BAD_REQUEST') return 'invalid';

  return codeForMessage(error.message);
}

/** Reads `?error=seats` back from the tour page URL; unknown values are ignored. */
export function readErrorCode(search: string): BookingErrorCode | null {
  const value = new URLSearchParams(search).get('error');

  return isBookingErrorCode(value) ? value : null;
}

export function isBookingErrorCode(value: string | null | undefined): value is BookingErrorCode {
  if (typeof value !== 'string') return false;

  return Object.prototype.hasOwnProperty.call(BOOKING_ERROR_MESSAGES, value);
}
