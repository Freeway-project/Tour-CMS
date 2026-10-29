import type { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DAY_DEPARTURE_CAPACITY, SEED, createDatabase } from './database';

/**
 * Payments, private confirmation links and hold expiry, against the real
 * migrations in PGlite.
 */

const TEST_ADDON_ID = '0c000000-0000-4000-8000-0000000000f1';
const SECOND_ADDON_ID = '0c000000-0000-4000-8000-0000000000f2';
const ADDON_PRICE_CENTS = 2500;

interface ReserveOptions {
  departureId: string;
  adults: number;
  children?: number;
  seniors?: number;
  addons?: Array<{ addon_id: string; quantity: number }>;
}

interface ReserveRow {
  booking_id: string;
  reference: string;
  total_cents: number;
  hold_expires_at: string;
  access_token: string;
}

interface DepartureRow {
  id: string;
}

interface PaidRow {
  changed: boolean;
  overbooked: boolean;
}

interface BookingRow {
  status: string;
  paid_at: string | null;
  stripe_checkout_session_id: string | null;
  access_token: string;
  hold_minutes: number;
}

async function firstDeparture(db: PGlite): Promise<string> {
  const { rows } = await db.query<DepartureRow>(
    `select id from public.departures where tour_id = $1 order by starts_at limit 1`,
    [SEED.dayTourId],
  );

  const row = rows[0];
  if (!row) throw new Error('No departures seeded for the day tour');
  return row.id;
}

async function addAddon(db: PGlite, id: string, name: string, pricing: string): Promise<void> {
  await db.query(
    `insert into public.addons (id, tour_id, name, description, price_cents, pricing, is_active, sort_order)
     values ($1, $2, $3, null, $4, $5, true, 1)`,
    [id, SEED.dayTourId, name, ADDON_PRICE_CENTS, pricing],
  );
}

async function reserve(db: PGlite, options: ReserveOptions): Promise<ReserveRow> {
  const { rows } = await db.query<ReserveRow>(
    `select booking_id, reference, total_cents, hold_expires_at, access_token
     from public.reserve_booking(
       $1::uuid, $2::uuid, $3::integer, $4::integer, $5::integer,
       $6::jsonb, $7::uuid, $8::text, $9::text, $10::text, $11::text
     )`,
    [
      options.departureId,
      SEED.dayPackageId,
      options.adults,
      options.children ?? 0,
      options.seniors ?? 0,
      JSON.stringify(options.addons ?? []),
      SEED.pickupId,
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

async function markPaid(
  db: PGlite,
  bookingId: string,
  sessionId = 'cs_test_123',
): Promise<PaidRow> {
  const { rows } = await db.query<PaidRow>(
    `select changed, overbooked from public.mark_booking_paid($1, $2)`,
    [sessionId, bookingId],
  );

  const row = rows[0];
  if (!row) throw new Error('mark_booking_paid returned no row');
  return row;
}

async function booking(db: PGlite, bookingId: string): Promise<BookingRow> {
  const { rows } = await db.query<BookingRow>(
    `select status, paid_at, stripe_checkout_session_id, access_token,
            round(extract(epoch from (hold_expires_at - created_at)) / 60)::integer as hold_minutes
     from public.bookings
     where id = $1`,
    [bookingId],
  );

  const row = rows[0];
  if (!row) throw new Error('Booking not found');
  return row;
}

describe('payments migration', () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it('holds the seats for 30 minutes and returns a private access token', async () => {
    const departureId = await firstDeparture(db);
    const first = await reserve(db, { departureId, adults: 2 });

    expect(first.access_token).toMatch(/^[0-9a-f]{48}$/);
    expect((await booking(db, first.booking_id)).hold_minutes).toBe(30);

    const second = await reserve(db, { departureId, adults: 1 });
    expect(second.access_token).not.toBe(first.access_token);
  });

  it('caps a per-person add-on at the number of people', async () => {
    await addAddon(db, TEST_ADDON_ID, 'Wine tasting', 'per_person');
    const departureId = await firstDeparture(db);

    await expect(
      reserve(db, {
        departureId,
        adults: 2,
        addons: [{ addon_id: TEST_ADDON_ID, quantity: 3 }],
      }),
    ).rejects.toThrow('invalid_addons');

    const ok = await reserve(db, {
      departureId,
      adults: 2,
      addons: [{ addon_id: TEST_ADDON_ID, quantity: 2 }],
    });
    expect(ok.total_cents).toBe(Math.round((2 * 9900 + 2 * ADDON_PRICE_CENTS) * 1.13));
  });

  it('does not cap a per-booking add-on at the number of people', async () => {
    await addAddon(db, TEST_ADDON_ID, 'Photo package', 'per_booking');
    const departureId = await firstDeparture(db);

    const row = await reserve(db, {
      departureId,
      adults: 1,
      addons: [{ addon_id: TEST_ADDON_ID, quantity: 5 }],
    });

    const { rows } = await db.query<{ quantity: number }>(
      `select (addons -> 0 ->> 'quantity')::integer as quantity
       from public.bookings where id = $1`,
      [row.booking_id],
    );
    expect(rows[0]?.quantity).toBe(1);
  });

  it('rejects the same add-on twice in one request', async () => {
    await addAddon(db, TEST_ADDON_ID, 'Wine tasting', 'per_person');
    await addAddon(db, SECOND_ADDON_ID, 'Photo package', 'per_booking');
    const departureId = await firstDeparture(db);

    await expect(
      reserve(db, {
        departureId,
        adults: 2,
        addons: [
          { addon_id: TEST_ADDON_ID, quantity: 1 },
          { addon_id: TEST_ADDON_ID, quantity: 1 },
        ],
      }),
    ).rejects.toThrow('invalid_addons');
  });

  it('marks a booking paid once and is idempotent on retry', async () => {
    const departureId = await firstDeparture(db);
    const reserved = await reserve(db, { departureId, adults: 2 });

    const first = await markPaid(db, reserved.booking_id, 'cs_test_first');
    expect(first).toEqual({ changed: true, overbooked: false });

    const stored = await booking(db, reserved.booking_id);
    expect(stored.status).toBe('paid');
    expect(stored.paid_at).not.toBeNull();
    expect(stored.stripe_checkout_session_id).toBe('cs_test_first');

    const retry = await markPaid(db, reserved.booking_id, 'cs_test_retry');
    expect(retry).toEqual({ changed: false, overbooked: false });

    // The retry must not overwrite the original session id or paid time.
    const afterRetry = await booking(db, reserved.booking_id);
    expect(afterRetry.stripe_checkout_session_id).toBe('cs_test_first');
    expect(afterRetry.paid_at).toEqual(stored.paid_at);
  });

  it('still marks an expired hold paid when the seats are free', async () => {
    const departureId = await firstDeparture(db);
    const reserved = await reserve(db, { departureId, adults: 3 });

    await db.query(
      `update public.bookings set hold_expires_at = now() - interval '5 minutes' where id = $1`,
      [reserved.booking_id],
    );

    const result = await markPaid(db, reserved.booking_id);
    expect(result).toEqual({ changed: true, overbooked: false });
    expect((await booking(db, reserved.booking_id)).status).toBe('paid');
  });

  it('flags an overbooked payment when someone else took the seats meanwhile', async () => {
    const departureId = await firstDeparture(db);
    const reserved = await reserve(db, { departureId, adults: 6 });

    // The hold runs out and another guest books most of the van.
    await db.query(
      `update public.bookings set hold_expires_at = now() - interval '5 minutes' where id = $1`,
      [reserved.booking_id],
    );
    await reserve(db, { departureId, adults: 6 });

    const result = await markPaid(db, reserved.booking_id);
    expect(result).toEqual({ changed: true, overbooked: true });

    // The payment is never silently lost.
    expect((await booking(db, reserved.booking_id)).status).toBe('paid');

    const { rows } = await db.query<{ seats_taken: number }>(
      `select seats_taken from public.departure_availability where id = $1`,
      [departureId],
    );
    expect(rows[0]?.seats_taken).toBeGreaterThan(DAY_DEPARTURE_CAPACITY);
  });

  it('returns changed = false for an unknown booking', async () => {
    const result = await markPaid(db, '00000000-0000-4000-8000-000000000000');
    expect(result).toEqual({ changed: false, overbooked: false });
  });

  it('expires pending holds that are past their deadline', async () => {
    const departureId = await firstDeparture(db);
    const stale = await reserve(db, { departureId, adults: 2 });
    const fresh = await reserve(db, { departureId, adults: 1 });

    await db.query(
      `update public.bookings set hold_expires_at = now() - interval '1 minute' where id = $1`,
      [stale.booking_id],
    );

    const { rows } = await db.query<{ expired: number }>(`select public.expire_holds() as expired`);
    expect(rows[0]?.expired).toBe(1);

    expect((await booking(db, stale.booking_id)).status).toBe('expired');
    expect((await booking(db, fresh.booking_id)).status).toBe('pending');
  });

  it('records a payment for a hold that the cron already expired', async () => {
    const departureId = await firstDeparture(db);
    const reserved = await reserve(db, { departureId, adults: 2 });

    await db.query(
      `update public.bookings set hold_expires_at = now() - interval '1 minute' where id = $1`,
      [reserved.booking_id],
    );
    await db.query(`select public.expire_holds()`);
    expect((await booking(db, reserved.booking_id)).status).toBe('expired');

    // Stripe can complete a session a moment after our hold ran out.
    const result = await markPaid(db, reserved.booking_id);
    expect(result).toEqual({ changed: true, overbooked: false });
    expect((await booking(db, reserved.booking_id)).status).toBe('paid');
  });

  it('keeps the payment functions away from anonymous and logged-in users', async () => {
    const { rows } = await db.query<{
      anon_paid: boolean;
      anon_expire: boolean;
      service_paid: boolean;
      service_expire: boolean;
    }>(
      `select
         has_function_privilege('anon', 'public.mark_booking_paid(text, uuid)', 'execute') as anon_paid,
         has_function_privilege('anon', 'public.expire_holds()', 'execute') as anon_expire,
         has_function_privilege('service_role', 'public.mark_booking_paid(text, uuid)', 'execute') as service_paid,
         has_function_privilege('service_role', 'public.expire_holds()', 'execute') as service_expire`,
    );

    expect(rows[0]).toEqual({
      anon_paid: false,
      anon_expire: false,
      service_paid: true,
      service_expire: true,
    });
  });
});
