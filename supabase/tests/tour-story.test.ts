import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SEED, createDatabase } from './database';

describe('0009 tour story', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createDatabase();
  });

  afterEach(async () => {
    await db.query('reset role');
    await db.close();
  });

  it('gives the shared tour its schedule capacity as the group limit, private tours none', async () => {
    const { rows } = await db.query<{ is_private: boolean; max_guests: number | null; capacity: number | null }>(
      `select t.is_private, t.max_guests,
              (select max(capacity) from public.schedules s where s.tour_id = t.id and s.is_active) as capacity
       from public.tours t order by t.is_private`,
    );
    const shared = rows.find((row) => !row.is_private);
    expect(shared?.max_guests).toBeGreaterThan(0);
    expect(shared?.max_guests).toBe(shared?.capacity);
    expect(rows.filter((row) => row.is_private).every((row) => row.max_guests === null)).toBe(true);
  });

  it('defaults itinerary, excludes, guide and vehicle to empty', async () => {
    const { rows: tours } = await db.query<{ itinerary: unknown; excludes: string[] }>(
      `select itinerary, excludes from public.tours where id = $1`,
      [SEED.dayTourId],
    );
    expect(tours[0]).toEqual({ itinerary: [], excludes: [] });

    const { rows: site } = await db.query(
      `select guide_name, guide_bio, guide_photo, vehicle_text, vehicle_photo from public.site_settings`,
    );
    expect(site[0]).toEqual({
      guide_name: '',
      guide_bio: '',
      guide_photo: null,
      vehicle_text: '',
      vehicle_photo: null,
    });
  });

  it('rejects malformed values', async () => {
    await expect(
      db.query(`update public.tours set itinerary = '{}'::jsonb where id = $1`, [SEED.dayTourId]),
    ).rejects.toThrow();
    await expect(
      db.query(`update public.tours set max_guests = 0 where id = $1`, [SEED.dayTourId]),
    ).rejects.toThrow();
    await expect(
      db.query(`update public.site_settings set guide_photo = '[]'::jsonb where id = 1`),
    ).rejects.toThrow();
  });

  it('lets anon read the new fields but not change them', async () => {
    await db.query('set role anon');
    const { rows } = await db.query(`select max_guests, itinerary, excludes from public.tours`);
    expect(rows.length).toBeGreaterThan(0);
    await db.query(`select guide_name, vehicle_photo from public.site_settings`);
    await expect(
      db.query(`update public.tours set max_guests = 99 where id = $1`, [SEED.dayTourId]),
    ).rejects.toThrow(/permission denied/);
  });
});
