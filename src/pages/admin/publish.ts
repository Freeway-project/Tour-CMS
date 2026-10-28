import type { APIRoute } from 'astro';

import { triggerPublish } from '../../lib/publish';

export const prerender = false;

export const POST: APIRoute = async ({ redirect }) => {
  await triggerPublish();
  return redirect('/admin?published=1');
};

export const GET: APIRoute = async ({ redirect }) => {
  return redirect('/admin');
};