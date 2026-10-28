import { actions, isInputError } from 'astro:actions';
import type { APIRoute } from 'astro';

import { codeForActionError } from '../../lib/booking-errors';
import {
  HOME_ERROR_URL,
  methodNotAllowed,
  readTourSlug,
  redirect,
  tourErrorUrl,
} from '../../lib/booking-http';

/**
 * No-JavaScript fallback for `#booking-form`.
 *
 * The tour page is prerendered, so `action={actions.reserveBooking}` could only
 * ever post to a static file. The form now posts here instead, and this route
 * runs the action on the worker and redirects: 303 to the confirmation page on
 * success, or back to the form with an `?error=` code on failure.
 *
 * The enhanced path is unchanged: the widget still calls the action with
 * `fetch` and redirects in the browser.
 */

export const prerender = false;

export const POST: APIRoute = async (context) => {
  let formData: FormData;

  try {
    formData = await context.request.formData();
  } catch {
    return new Response('Bad Request', {
      status: 400,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const slug = readTourSlug(formData);
  if (!slug) return redirect(HOME_ERROR_URL);

  const result = await context.callAction(actions.reserveBooking, formData);

  if (result.error) {
    const code = isInputError(result.error) ? 'invalid' : codeForActionError(result.error);

    return redirect(tourErrorUrl(slug, code));
  }

  return redirect(`/booking/confirmed?ref=${encodeURIComponent(result.data.reference)}`);
};

export const ALL: APIRoute = () => methodNotAllowed();
