import type { APIRoute } from 'astro';

import { robotsTxt } from '../lib/policies';

export const prerender = true;

export const GET: APIRoute = ({ site }) =>
  new Response(robotsTxt(site ?? new URL('https://torontoniagara.ca')), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
