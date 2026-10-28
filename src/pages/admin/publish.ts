import type { APIRoute } from 'astro';

import { triggerPublish } from '../../lib/publish';

export const prerender = false;

export const POST: APIRoute = async ({ locals, redirect }) => {
  const supabase = locals.supabase;
  const waitUntil = locals.runtime?.ctx?.waitUntil;
  if (supabase) {
    await triggerPublish(supabase, waitUntil);
  }
  return redirect('/admin?saved=1');
};

export const GET: APIRoute = async ({ redirect }) => {
  return redirect('/admin');
};