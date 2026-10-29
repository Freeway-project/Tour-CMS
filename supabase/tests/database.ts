import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Boots a throwaway Postgres (PGlite) with the Supabase stub, every migration
 * and the seed data. Shared by the schema and payment tests so a new migration
 * is added in one place.
 */

const MIGRATIONS = [
  '0001_init.sql',
  '0002_group_pricing.sql',
  '0003_owner_content.sql',
  '0004_admin_functions.sql',
  '0005_payments.sql',
  '0006_payment_fixes.sql',
];

async function readSql(relativePath: string): Promise<string> {
  return readFile(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');
}

export async function createDatabase(): Promise<PGlite> {
  const [stub, migrations, seed] = await Promise.all([
    readSql('./supabase-stub.sql'),
    Promise.all(MIGRATIONS.map((file) => readSql(`../migrations/${file}`))),
    readSql('../seed.sql'),
  ]);

  const db = new PGlite();
  await db.exec(stub);
  for (const migration of migrations) await db.exec(migration);
  await db.exec(seed);
  return db;
}

/** Fixed ids from `supabase/seed.sql`. */
export const SEED = {
  dayTourId: '0a000000-0000-4000-8000-000000000001',
  privateTourId: '0a000000-0000-4000-8000-000000000002',
  dayPackageId: '0b000000-0000-4000-8000-000000000001',
  privateVan6PackageId: '0b000000-0000-4000-8000-000000000002',
  privateVan11PackageId: '0b000000-0000-4000-8000-000000000003',
  pickupId: '0d000000-0000-4000-8000-000000000001',
} as const;

export const DAY_DEPARTURE_CAPACITY = 11;
