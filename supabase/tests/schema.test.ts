import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

/**
 * Runs the real migrations and seed against PGlite, which is Postgres compiled
 * to WebAssembly, so no Docker and no network are needed.
 */

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

const DAY_TOUR_ID = '0a000000-0000-4000-8000-000000000001';
const PRIVATE_TOUR_ID = '0a000000-0000-4000-8000-000000000002';
const DAY_PACKAGE_ID = '0b000000-0000-4000-8000-000000000001';
const PRIVATE_VAN_6_PACKAGE_ID = '0b000000-0000-4000-8000-000000000002';
const PRIVATE_VAN_11_PACKAGE_ID = '0b000000-0000-4000-8000-000000000003';
const PICKUP_ID = '0d000000-0000-4000-8000-000000000001';

/** Add-ons and child prices are not seeded, so tests add what they need. */
const TEST_ADDON_ID = '0c000000-0000-4000-8000-0000000000ff';
const TEST_CHILD_PRICE_CENTS = 7920;
const TEST_ADDON_PRICE_CENTS = 2500;

const DAY_DEPARTURE_CAPACITY = 11;

interface ReserveOptions {
  departureId: string;
  adults: number;
  children?: number;
  seniors?: number;
  packageId?: string;
  addons?: Array<{ addon_id: string; quantity: number }>;
  pickupLocationId?: string;
}

interface ReserveRow {
  booking_id: string;
  reference: string;
  total_cents: number;
  hold_expires_at: string;
}

interface DepartureRow {
  id: string;
  starts_at: string;
}

interface SeatsLeftRow {
  seats_left: number;
}

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

async function firstDeparture(db: PGlite, tourId: string): Promise<string> {
  const { rows } = await db.query<DepartureRow>(
    `select id, starts_at
     from public.departures
     where tour_id = $1
     order by starts_at
     limit 1`,
    [tourId],
  );

  const row = rows[0];
  if (!row) throw new Error(`No departures seeded for tour ${tourId}`);
  return row.id;
}

/** Private tours are not seeded with departures, so tests create one. */
async function addDeparture(db: PGlite, tourId: string): Promise<string> {
  const { rows } = await db.query<DepartureRow>(
    `insert into public.departures (tour_id, starts_at, capacity, status)
     values ($1, now() + interval '1 day', $2, 'open')
     returning id, starts_at`,
    [tourId, DAY_DEPARTURE_CAPACITY],
  );

  const row = rows[0];
  if (!row) throw new Error(`Could not create a departure for tour ${tourId}`);
  return row.id;
}

async function seatsLeft(db: PGlite, departureId: string): Promise<number> {
  const { rows } = await db.query<SeatsLeftRow>(
    `select seats_left from public.departure_availability where id = $1`,
    [departureId],
  );

  const row = rows[0];
  if (!row) throw new Error(`No availability row for departure ${departureId}`);
  return row.seats_left;
}

async function reserve(db: PGlite, options: ReserveOptions): Promise<ReserveRow> {
  const { rows } = await db.query<ReserveRow>(
    `select booking_id, reference, total_cents, hold_expires_at
     from public.reserve_booking(
       $1::uuid, $2::uuid, $3::integer, $4::integer, $5::integer,
       $6::jsonb, $7::uuid, $8::text, $9::text, $10::text, $11::text
     )`,
    [
      options.departureId,
      options.packageId ?? DAY_PACKAGE_ID,
      options.adults,
      options.children ?? 0,
      options.seniors ?? 0,
      JSON.stringify(options.addons ?? []),
      options.pickupLocationId ?? PICKUP_ID,
      'Test Guest',
      'guest@example.com',
      null,
      null,
    ],
  );

  const row = rows[0];
  if (!row) throw new Error('reserve_booking returned no row');
  return row;
}

describe('supabase schema', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it('prices 2 adults + 1 child + an add-on from the database and takes the seats', async () => {
    const departureId = await firstDeparture(db, DAY_TOUR_ID);

    // A child price and an add-on, inserted here rather than in the seed.
    await db.query(`update public.packages set price_child_cents = $2 where id = $1`, [
      DAY_PACKAGE_ID,
      TEST_CHILD_PRICE_CENTS,
    ]);
    await db.query(
      `insert into public.addons (id, tour_id, name, description, price_cents, pricing, is_active, sort_order)
       values ($1, $2, 'Test add-on', null, $3, 'per_person', true, 1)`,
      [TEST_ADDON_ID, DAY_TOUR_ID, TEST_ADDON_PRICE_CENTS],
    );

    const { rows: packageRows } = await db.query<{
      price_adult_cents: number;
      price_child_cents: number | null;
    }>(`select price_adult_cents, price_child_cents from public.packages where id = $1`, [
      DAY_PACKAGE_ID,
    ]);
    const { rows: addonRows } = await db.query<{ price_cents: number }>(
      `select price_cents from public.addons where id = $1`,
      [TEST_ADDON_ID],
    );

    const pkg = packageRows[0];
    const addon = addonRows[0];
    if (!pkg || !addon) throw new Error('Test data is missing the package or add-on');
    if (pkg.price_child_cents === null)
      throw new Error('Expected a child price on the day tour package');

    const addonQuantity = 3;
    const subtotalCents =
      2 * pkg.price_adult_cents + 1 * pkg.price_child_cents + addonQuantity * addon.price_cents;
    const taxCents = Math.round((subtotalCents * 13) / 100);

    expect(await seatsLeft(db, departureId)).toBe(DAY_DEPARTURE_CAPACITY);

    const booking = await reserve(db, {
      departureId,
      adults: 2,
      children: 1,
      addons: [{ addon_id: TEST_ADDON_ID, quantity: addonQuantity }],
    });

    // 2 × 9900 + 1 × 7920 + 3 × 2500 = 35220; HST 4579; total 39799.
    expect(subtotalCents).toBe(35220);
    expect(booking.total_cents).toBe(subtotalCents + taxCents);
    expect(booking.total_cents).toBe(39799);
    expect(booking.reference).toMatch(/^TN-[A-Z0-9]{6}$/);

    expect(await seatsLeft(db, departureId)).toBe(DAY_DEPARTURE_CAPACITY - 3);

    const { rows: bookingRows } = await db.query<{
      status: string;
      subtotal_cents: number;
      tax_cents: number;
      total_cents: number;
      addons: Array<{ addon_id: string; quantity: number; unit_cents: number }>;
    }>(
      `select status, subtotal_cents, tax_cents, total_cents, addons
       from public.bookings
       where id = $1`,
      [booking.booking_id],
    );

    const stored = bookingRows[0];
    if (!stored) throw new Error('Booking was not inserted');
    expect(stored.status).toBe('pending');
    expect(stored.subtotal_cents).toBe(subtotalCents);
    expect(stored.tax_cents).toBe(taxCents);
    expect(stored.addons).toHaveLength(1);
    expect(stored.addons[0]?.quantity).toBe(addonQuantity);
  });

  it('raises not_enough_seats when a second booking exceeds capacity 11', async () => {
    const departureId = await firstDeparture(db, DAY_TOUR_ID);

    await reserve(db, { departureId, adults: 5 });
    expect(await seatsLeft(db, departureId)).toBe(DAY_DEPARTURE_CAPACITY - 5);

    await expect(reserve(db, { departureId, adults: 7 })).rejects.toThrow('not_enough_seats');
    expect(await seatsLeft(db, departureId)).toBe(DAY_DEPARTURE_CAPACITY - 5);
  });

  it('frees the seats again when a pending hold has expired', async () => {
    const departureId = await firstDeparture(db, DAY_TOUR_ID);

    const booking = await reserve(db, { departureId, adults: 3 });
    expect(await seatsLeft(db, departureId)).toBe(DAY_DEPARTURE_CAPACITY - 3);

    await db.query(
      `update public.bookings
       set hold_expires_at = now() - interval '1 minute'
       where id = $1`,
      [booking.booking_id],
    );

    expect(await seatsLeft(db, departureId)).toBe(DAY_DEPARTURE_CAPACITY);
  });

  it('rejects a package that belongs to another tour', async () => {
    const departureId = await firstDeparture(db, DAY_TOUR_ID);

    await expect(
      reserve(db, { departureId, adults: 1, packageId: PRIVATE_VAN_11_PACKAGE_ID }),
    ).rejects.toThrow('package_not_available');
  });

  it('rejects a private per-group package with private_tour_inquiry_only', async () => {
    const departureId = await addDeparture(db, PRIVATE_TOUR_ID);

    await expect(
      reserve(db, { departureId, adults: 4, packageId: PRIVATE_VAN_6_PACKAGE_ID }),
    ).rejects.toThrow('private_tour_inquiry_only');
  });

  it('refuses to insert a per-group package without max_pax', async () => {
    await expect(
      db.query(
        `insert into public.packages (tour_id, name, price_adult_cents, pricing_mode)
         values ($1, 'Van with no group size', 50000, 'per_group')`,
        [PRIVATE_TOUR_ID],
      ),
    ).rejects.toThrow(/packages_per_group_max_pax_check/);
  });
});
