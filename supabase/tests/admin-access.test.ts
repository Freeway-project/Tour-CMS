import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SEED, createDatabase } from './database';

/**
 * The owner admin queries with their own session (`authenticated`), so table
 * privileges and the `*_admin_all` policies must line up: admins see and edit
 * bookings, any other signed-in user sees nothing, anon is refused outright.
 */

const ADMIN_ID = '0f000000-0000-4000-8000-0000000000a1';
const OTHER_USER_ID = '0f000000-0000-4000-8000-0000000000b2';

async function actAs(db: PGlite, userId: string | null): Promise<void> {
  await db.query('reset role');
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? '']);
  await db.query(userId ? 'set role authenticated' : 'set role anon');
}

async function count(db: PGlite, table: string): Promise<number> {
  const { rows } = await db.query<{ c: number }>(`select count(*)::integer as c from public.${table}`);
  return rows[0]?.c ?? -1;
}

describe('admin access to private tables', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createDatabase();
    await db.query(`insert into auth.users (id) values ($1), ($2)`, [ADMIN_ID, OTHER_USER_ID]);
    await db.query(`insert into public.admins (user_id) values ($1)`, [ADMIN_ID]);

    const { rows } = await db.query<{ id: string }>(
      `select id from public.departures where tour_id = $1 order by starts_at limit 1`,
      [SEED.dayTourId],
    );
    await db.query(
      `select public.reserve_booking(
         $1::uuid, $2::uuid, 2, 0, 0, '[]'::jsonb, $3::uuid,
         'Test Guest', 'guest@example.com', null, null, false
       )`,
      [rows[0]!.id, SEED.dayPackageId, SEED.pickupId],
    );
  });

  afterEach(async () => {
    await db.query('reset role');
    await db.close();
  });

  it('lets an admin read and update bookings, inquiries and schedules', async () => {
    await actAs(db, ADMIN_ID);

    expect(await count(db, 'bookings')).toBe(1);
    expect(await count(db, 'inquiries')).toBe(0);
    expect(await count(db, 'schedules')).toBe(1);
    expect(await count(db, 'blackout_dates')).toBe(0);

    const { rows } = await db.query<{ id: string }>(
      `update public.bookings set notes = 'called the guest' returning id`,
    );
    expect(rows).toHaveLength(1);
  });

  it('shows a signed-in non-admin nothing', async () => {
    await actAs(db, OTHER_USER_ID);

    expect(await count(db, 'bookings')).toBe(0);
    expect(await count(db, 'admins')).toBe(0);
    expect(await count(db, 'schedules')).toBe(0);

    const { rows } = await db.query(`update public.bookings set notes = 'x' returning id`);
    expect(rows).toHaveLength(0);
  });

  it('refuses anon outright', async () => {
    await actAs(db, null);

    await expect(count(db, 'bookings')).rejects.toThrow(/permission denied/);
    await expect(count(db, 'inquiries')).rejects.toThrow(/permission denied/);
  });
});
