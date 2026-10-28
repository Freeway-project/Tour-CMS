import type { BookingErrorCode } from './booking-errors';

/**
 * Helpers shared by the no-JavaScript form endpoints
 * (`/booking/reserve` and `/booking/inquire`).
 *
 * Those routes exist for the same reason: `#booking-form` and `#inquiry-form`
 * live on prerendered pages, so a plain HTML `POST` cannot reach an Astro
 * Action. Each endpoint calls the action with `context.callAction()` and then
 * answers with a 303 redirect, which is what a browser form expects.
 */

/** Tour slugs come from the catalogue and are lowercase kebab-case. */
const TOUR_SLUG_PATTERN = /^[a-z0-9-]+$/;

/** 303 makes the browser follow up with a GET instead of reposting. */
export function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { location } });
}

/** The slug from the form's hidden `tourSlug` input, or null when tampered with. */
export function readTourSlug(formData: FormData): string | null {
  const value = formData.get('tourSlug');
  if (typeof value !== 'string') return null;

  const slug = value.trim();

  return TOUR_SLUG_PATTERN.test(slug) ? slug : null;
}

/** Back to the form, with a code the widget script turns into a message. */
export function tourErrorUrl(slug: string, code: BookingErrorCode): string {
  return `/tours/${slug}/?error=${code}#book`;
}

/** A missing or invalid slug has no tour to go back to, so fall back to the home page. */
export const HOME_ERROR_URL = '/?error=invalid';

/** Endpoints here only accept POST; everything else gets a 405 with `Allow: POST`. */
export function methodNotAllowed(): Response {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { allow: 'POST', 'content-type': 'text/plain; charset=utf-8' },
  });
}
