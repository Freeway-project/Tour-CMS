import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const stubPath = fileURLToPath(new URL('./supabase-stub.sql', import.meta.url));
const initMigrationPath = fileURLToPath(new URL('../migrations/0001_init.sql', import.meta.url));
const groupPricingMigrationPath = fileURLToPath(
  new URL('../migrations/0002_group_pricing.sql', import.meta.url),
);
const ownerContentMigrationPath = fileURLToPath(
  new URL('../migrations/0003_owner_content.sql', import.meta.url),
);
const adminFunctionsMigrationPath = fileURLToPath(
  new URL('../migrations/0004_admin_functions.sql', import.meta.url),
);
const seedPath = fileURLToPath(new URL('../seed.sql', import.meta.url));

async function createDatabase(): Promise<PGlite> {
  const [stub, initMigration, groupPricingMigration, ownerContentMigration, adminFunctionsMigration, seed] =
    await Promise.all([
      readFile(stubPath, 'utf8'),
      readFile(initMigrationPath, 'utf8'),
      readFile(groupPricingMigrationPath, 'utf8'),
      readFile(ownerContentMigrationPath, 'utf8'),
      readFile(adminFunctionsMigrationPath, 'utf8'),
      readFile(seedPath, 'utf8'),
    ]);
  const db = new PGlite();
  await db.exec(stub);
  await db.exec(initMigration);
  await db.exec(groupPricingMigration);
  await db.exec(ownerContentMigration);
  await db.exec(adminFunctionsMigration);
  await db.exec(seed);
  return db;
}

describe('owner content (task 05)', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it('generate_departures uses correct offsets and DST-aware times', async () => {
    const { rows } = await db.query<{ starts_at: string }>(
      `select starts_at from public.departures
       where tour_id = '0a000000-0000-4000-8000-000000000001'::uuid
         and starts_at >= '2026-10-30T00:00:00Z' and starts_at < '2026-10-31T00:00:00Z'`,
    );
    expect(rows).toHaveLength(1);
    expect(String(rows[0]!.starts_at)).toContain('12:00:00');

    const { rows: rows2 } = await db.query<{ starts_at: string }>(
      `select starts_at from public.departures
       where tour_id = '0a000000-0000-4000-8000-000000000001'::uuid
         and starts_at >= '2026-11-02T00:00:00Z' and starts_at < '2026-11-03T00:00:00Z'`,
    );
    expect(rows2).toHaveLength(1);
    expect(String(rows2[0]!.starts_at)).toContain('13:00:00');
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
