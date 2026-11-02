import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './database';

describe('owner content (task 05)', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it('generate_departures uses correct offsets and DST-aware times', async () => {
    // Generation starts from today, so fixed dates go stale. A year ahead always
    // spans both a daylight-time and a standard-time stretch in Toronto.
    await db.query(`select public.generate_departures(400)`);

    const { rows } = await db.query<{ local_time: string; utc_hour: number }>(
      `select distinct
         to_char(starts_at at time zone 'America/Toronto', 'HH24:MI') as local_time,
         extract(hour from starts_at at time zone 'UTC')::integer as utc_hour
       from public.departures
       where tour_id = '0a000000-0000-4000-8000-000000000001'::uuid
       order by utc_hour`,
    );
    // The 08:00 schedule stays 08:00 on the wall clock all year: 12:00 UTC in
    // daylight time (UTC-4), 13:00 UTC in standard time (UTC-5).
    expect(rows).toEqual([
      { local_time: '08:00', utc_hour: 12 },
      { local_time: '08:00', utc_hour: 13 },
    ]);
  });

  it('generate_departures is idempotent and does not touch existing departures', async () => {
    const { rows: before } = await db.query<{ c: string }>(
      `select count(*)::text as c from public.departures where tour_id = '0a000000-0000-4000-8000-000000000001'::uuid`,
    );
    const beforeCount = Number(before[0]?.c);

    // Mutate an existing departure's capacity; regeneration must not overwrite it.
    await db.query(
      `update public.departures set capacity = 999
       where id = (select id from public.departures
                   where tour_id = '0a000000-0000-4000-8000-000000000001'::uuid
                   order by starts_at limit 1)`,
    );

    await db.query(`select public.generate_departures(30)`);
    await db.query(`select public.generate_departures(30)`);

    const { rows: after } = await db.query<{ c: string }>(
      `select count(*)::text as c from public.departures where tour_id = '0a000000-0000-4000-8000-000000000001'::uuid`,
    );
    expect(Number(after[0]?.c)).toBe(beforeCount);
    const { rows: cap } = await db.query<{ capacity: number }>(
      `select capacity from public.departures
       where tour_id = '0a000000-0000-4000-8000-000000000001'::uuid
       order by starts_at limit 1`,
    );
    expect(cap[0]?.capacity).toBe(999);
  });

  it('generate_departures skips blackout dates', async () => {
    // Fresh tour + schedule + blackout for tomorrow.
    await db.query(
      `insert into public.tours (id, slug, title, short_description, description, duration_minutes, hero_image_path, status)
       values ('11111111-1111-4111-8111-111111111111', 't', 'T', 's', 'd', 60, '/x', 'active')`,
    );
    await db.query(
      `insert into public.schedules (tour_id, weekdays, start_time, capacity, valid_from, is_active)
       values ('11111111-1111-4111-8111-111111111111', array[0,1,2,3,4,5,6], '08:00', 5, current_date, true)`,
    );
    const { rows: tmr } = await db.query<{ d: string }>(
      `select (current_date + interval '1 day')::date::text as d`,
    );
    const tomorrow = tmr[0]?.d as string;
    await db.query(
      `insert into public.blackout_dates (tour_id, date, reason)
       values ('11111111-1111-4111-8111-111111111111', $1::date, 'closed')`,
      [tomorrow],
    );

    await db.query(`select public.generate_departures(3)`);

    const { rows } = await db.query<{ c: string }>(
      `select count(*)::text as c from public.departures
       where tour_id = '11111111-1111-4111-8111-111111111111'::uuid
         and starts_at::timestamptz::date = $1::date`,
      [tomorrow],
    );
    expect(Number(rows[0]?.c)).toBe(0);
  });

  it('generate_departures is service_role only', async () => {
    await db.query('set role anon');
    await expect(db.query(`select public.generate_departures(1)`)).rejects.toThrow();
    await db.query('reset role');
  });

  it('anon cannot write admin tables', async () => {
    await db.query('set role anon');
    await expect(
      db.query(`insert into public.faqs (question, answer) values ('q', 'a')`),
    ).rejects.toThrow();
    await expect(
      db.query(`update public.site_settings set name = 'x' where id = 1`),
    ).rejects.toThrow();
    await db.query('reset role');
  });

  it('anon cannot read inactive FAQs, inactive reviews or hidden tours', async () => {
    // Insert inactive/hidden rows as the privileged default role.
    await db.query(
      `insert into public.faqs (question, answer, is_active) values ('hidden faq', 'a', false)`,
    );
    await db.query(
      `insert into public.reviews (author, rating, text, review_date, source, is_active)
       values ('Hidden', 5, 'x', current_date, 'direct', false)`,
    );
    await db.query(
      `insert into public.tours (slug, title, short_description, description, duration_minutes, hero_image_path, status)
       values ('hidden-tour', 'Hidden tour', 's', 'd', 60, '/x', 'hidden')`,
    );

    await db.query('set role anon');

    const { rows: faqs } = await db.query<{ question: string }>(
      `select question from public.faqs where question = 'hidden faq'`,
    );
    expect(faqs).toHaveLength(0);

    const { rows: reviews } = await db.query<{ author: string }>(
      `select author from public.reviews where author = 'Hidden'`,
    );
    expect(reviews).toHaveLength(0);

    const { rows: tours } = await db.query<{ slug: string }>(
      `select slug from public.tours where slug = 'hidden-tour'`,
    );
    expect(tours).toHaveLength(0);

    await db.query('reset role');
  });

  it('admin_generate_departures errors for a non-admin', async () => {
    await db.query('set role authenticated');
    await expect(db.query(`select public.admin_generate_departures(1)`)).rejects.toThrow();
    await db.query('reset role');
  });
});
