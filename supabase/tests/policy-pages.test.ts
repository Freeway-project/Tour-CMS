import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createDatabase } from './database';

describe('0008 policy pages', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createDatabase();
  });

  afterEach(async () => {
    await db.query('reset role');
    await db.close();
  });

  it('adds non-null privacy_policy and terms that default to empty', async () => {
    const { rows } = await db.query<{ column_name: string; is_nullable: string; column_default: string }>(
      `select column_name, is_nullable, column_default
       from information_schema.columns
       where table_schema = 'public' and table_name = 'site_settings'
         and column_name in ('privacy_policy', 'terms')
       order by column_name`,
    );
    expect(rows.map((row) => [row.column_name, row.is_nullable])).toEqual([
      ['privacy_policy', 'NO'],
      ['terms', 'NO'],
    ]);
    for (const row of rows) expect(row.column_default).toContain("''");
  });

  it('seeds placeholders, never invented legal text', async () => {
    const { rows } = await db.query<{ privacy_policy: string; terms: string }>(
      `select privacy_policy, terms from public.site_settings where id = 1`,
    );
    expect(rows[0]?.privacy_policy).toMatch(/^TODO:/);
    expect(rows[0]?.terms).toMatch(/^TODO:/);
  });

  it('lets anon read the policies but not change them', async () => {
    await db.query('set role anon');
    const { rows } = await db.query<{ terms: string }>(`select terms from public.site_settings`);
    expect(rows).toHaveLength(1);
    await expect(
      db.query(`update public.site_settings set terms = 'x' where id = 1`),
    ).rejects.toThrow(/permission denied/);
  });
});
