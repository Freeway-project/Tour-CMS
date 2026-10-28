import type { APIRoute } from 'astro';

import { generateFixtureDepartures } from '../../lib/availability';
import { isIsoDate, todayInToronto, torontoDateStart } from '../../lib/datetime';
import { supabase } from '../../lib/db/client';
import type { AvailabilitySlot } from '../../lib/types';

/**
 * Live seat availability for one tour.
 *
 * `GET /api/availability?tour=<slug>&from=YYYY-MM-DD&days=45` returns only
 * departures that are still open, in the future and have at least one seat
 * left. Without Supabase it serves the fixture calendar instead, so the booking
 * widget works on an offline build.
 */

export const prerender = false;

const DEFAULT_DAYS = 45;
const MAX_DAYS = 90;

interface AvailabilityRow {
  id: string;
  starts_at: string;
  seats_left: number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, s-maxage=30',
    },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('tour')?.trim() ?? '';
  if (!slug) return json({ error: 'Missing tour parameter' }, 400);

  const fromParam = url.searchParams.get('from');
  const from = fromParam ?? todayInToronto();
  if (!isIsoDate(from)) return json({ error: 'from must be a YYYY-MM-DD date' }, 400);

  const requestedDays = Number.parseInt(url.searchParams.get('days') ?? '', 10);
  const days = Number.isFinite(requestedDays)
    ? Math.min(Math.max(requestedDays, 1), MAX_DAYS)
    : DEFAULT_DAYS;

  if (!supabase) {
    // Fixtures only exist for the next 30 days.
    return json(generateFixtureDepartures(slug, from, Math.min(days, 30)));
  }

  const { data: tour, error: tourError } = await supabase
    .from('tours')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (tourError) return json({ error: 'Could not load the tour' }, 503);
  if (!tour) return json([]);

  const fromDate = torontoDateStart(from) ?? new Date();
  const toDate = new Date(fromDate.getTime() + days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('departure_availability')
    .select('id, starts_at, seats_left')
    .eq('tour_id', tour.id)
    .eq('status', 'open')
    .gt('seats_left', 0)
    .gte('starts_at', fromDate.toISOString())
    .lte('starts_at', toDate.toISOString())
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  if (error) return json({ error: 'Could not load availability' }, 503);

  const slots: AvailabilitySlot[] = (data as unknown as AvailabilityRow[]).map((row) => ({
    departureId: row.id,
    startsAt: row.starts_at,
    seatsLeft: row.seats_left,
  }));

  return json(slots);
};
