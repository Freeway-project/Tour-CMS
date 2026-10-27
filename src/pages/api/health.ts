import type { APIRoute } from 'astro';

// Opts this route out of prerendering so it runs on the Cloudflare worker.
export const prerender = false;

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
