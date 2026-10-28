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
 * No-JavaScript fallback for `#inquiry-form`, the private-tour request form.
 *
 * Same contract as `/booking/reserve`: the prerendered form posts here, the
 * action runs on the worker, and the browser is redirected with a 303.
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

  const result = await context.callAction(actions.createInquiry, formData);

  if (result.error) {
    const code = isInputError(result.error) ? 'invalid' : codeForActionError(result.error);

    return redirect(tourErrorUrl(slug, code));
  }

  return redirect('/booking/inquiry-sent');
};

export const ALL: APIRoute = () => methodNotAllowed();
