-- Payment fixes from the task 06 review.
--
-- Three rules change:
--   1. A booking can be paid manually (no Stripe), in which case it holds its
--      seats until the owner confirms or cancels it.
--   2. `mark_booking_paid` reports a payment for a cancelled/refunded booking so
--      the webhook can alert the owner instead of losing it silently.
--   3. pgcrypto lives in Supabase's `extensions` schema, so the access token
--      default is qualified explicitly.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

-- `stripe` bookings expire after the 30-minute Checkout hold. `manual` bookings
-- are arranged by phone/email: they keep their seats until the owner acts.
alter table public.bookings
  add column payment_method text not null default 'stripe'
    check (payment_method in ('stripe', 'manual'));

-- Supabase installs pgcrypto in the `extensions` schema. Qualifying it keeps the
-- column default working even when `extensions` is not on the search path.
alter table public.bookings
  alter column access_token
    set default encode(extensions.gen_random_bytes(24), 'hex');

-- ---------------------------------------------------------------------------
-- Booking
-- ---------------------------------------------------------------------------

-- The argument list grows by `p_manual_payment`, so the old 11-argument version
-- is dropped first. The OUT columns, security settings and grants stay the same.
drop function if exists public.reserve_booking(
  uuid, uuid, integer, integer, integer, jsonb, uuid, text, text, text, text
);

-- Creates a pending booking and holds its seats. A Stripe booking holds them for
-- 30 minutes; a manual booking has no deadline (`hold_expires_at` is null) and
-- holds them until the owner confirms or cancels it. Every price is read from
-- the database: the arguments only say who is coming and what they picked.
create or replace function public.reserve_booking(
  p_departure_id uuid,
  p_package_id uuid,
  p_adults integer,
  p_children integer,
  p_seniors integer,
  p_addons jsonb,
  p_pickup_location_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_notes text,
  p_manual_payment boolean default false
)
returns table (
  booking_id uuid,
  reference text,
  total_cents integer,
  hold_expires_at timestamptz,
  access_token text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_departure public.departures%rowtype;
  v_package public.packages%rowtype;
  v_addon public.addons%rowtype;
  v_addon_id uuid;
  v_seen_addons uuid[] := '{}';
  v_item jsonb;
  v_pax integer;
  v_seats_taken integer;
  v_seats_left integer;
  v_adult_cents integer;
  v_child_cents integer;
  v_senior_cents integer;
  v_quantity integer;
  v_unit_cents integer;
  v_subtotal_cents integer := 0;
  v_tax_cents integer;
  v_total_cents integer;
  v_manual boolean := coalesce(p_manual_payment, false);
  v_hold_expires_at timestamptz;
  v_payment_method text;
  v_addons jsonb := '[]'::jsonb;
  v_booking_id uuid := gen_random_uuid();
  v_access_token text;
  v_reference text;
  v_attempt integer := 0;
begin
  if p_adults is null or p_children is null or p_seniors is null then
    raise exception 'invalid_passenger_counts';
  end if;

  if p_adults < 0 or p_children < 0 or p_seniors < 0 then
    raise exception 'invalid_passenger_counts';
  end if;

  v_pax := p_adults + p_children + p_seniors;

  if v_pax <= 0 then
    raise exception 'invalid_passenger_counts';
  end if;

  -- A manual booking is not racing a Checkout session, so it has no deadline.
  if v_manual then
    v_payment_method := 'manual';
    v_hold_expires_at := null;
  else
    v_payment_method := 'stripe';
    v_hold_expires_at := now() + interval '30 minutes';
  end if;

  select d.* into v_departure
  from public.departures d
  where d.id = p_departure_id
  for update;

  if not found then
    raise exception 'departure_not_found';
  end if;

  if v_departure.status <> 'open' then
    raise exception 'departure_not_open';
  end if;

  if v_departure.starts_at <= now() then
    raise exception 'departure_in_past';
  end if;

  select p.* into v_package
  from public.packages p
  where p.id = p_package_id;

  if not found
     or v_package.tour_id <> v_departure.tour_id
     or not v_package.is_active then
    raise exception 'package_not_available';
  end if;

  -- Private (per-group) tours are priced per vehicle and arranged by inquiry.
  if v_package.pricing_mode = 'per_group' then
    raise exception 'private_tour_inquiry_only';
  end if;

  v_seats_taken := public.departure_seats_taken(p_departure_id);
  v_seats_left := v_departure.capacity - v_seats_taken;

  if v_pax > v_seats_left then
    raise exception 'not_enough_seats';
  end if;

  v_adult_cents := v_package.price_adult_cents;
  v_child_cents := coalesce(v_package.price_child_cents, v_package.price_adult_cents);
  v_senior_cents := coalesce(v_package.price_senior_cents, v_package.price_adult_cents);

  v_subtotal_cents :=
    p_adults * v_adult_cents + p_children * v_child_cents + p_seniors * v_senior_cents;

  if p_addons is not null then
    if jsonb_typeof(p_addons) <> 'array' then
      raise exception 'invalid_addons';
    end if;

    for v_item in select * from jsonb_array_elements(p_addons) loop
      if v_item ->> 'addon_id' is null then
        raise exception 'addon_not_available';
      end if;

      v_addon_id := (v_item ->> 'addon_id')::uuid;

      -- One line per add-on: duplicates would be priced twice, which the
      -- booking widget never does and a tampered request must not do either.
      if v_addon_id = any (v_seen_addons) then
        raise exception 'invalid_addons';
      end if;
      v_seen_addons := v_seen_addons || v_addon_id;

      select a.* into v_addon
      from public.addons a
      where a.id = v_addon_id;

      if not found
         or v_addon.tour_id <> v_departure.tour_id
         or not v_addon.is_active then
        raise exception 'addon_not_available';
      end if;

      v_quantity := greatest(coalesce((v_item ->> 'quantity')::integer, 1), 0);

      if v_addon.pricing = 'per_booking' then
        v_quantity := case when v_quantity > 0 then 1 else 0 end;
      elsif v_quantity > v_pax then
        -- A per-person extra cannot be bought for more people than are coming.
        raise exception 'invalid_addons';
      end if;

      v_unit_cents := v_addon.price_cents;
      v_subtotal_cents := v_subtotal_cents + v_unit_cents * v_quantity;

      v_addons := v_addons || jsonb_build_object(
        'addon_id', v_addon.id,
        'name', v_addon.name,
        'quantity', v_quantity,
        'unit_cents', v_unit_cents
      );
    end loop;
  end if;

  v_tax_cents := round(v_subtotal_cents::numeric * 13 / 100)::integer;
  v_total_cents := v_subtotal_cents + v_tax_cents;

  -- Short human reference such as TN-7K3F9Q. Retry on the (unlikely) collision.
  loop
    v_attempt := v_attempt + 1;
    v_reference := 'TN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (
      select 1 from public.bookings b where b.reference = v_reference
    );
    if v_attempt >= 10 then
      raise exception 'booking_reference_collision';
    end if;
  end loop;

  insert into public.bookings as b (
    id,
    reference,
    departure_id,
    package_id,
    pickup_location_id,
    adults,
    children,
    seniors,
    addons,
    subtotal_cents,
    tax_cents,
    total_cents,
    currency,
    status,
    payment_method,
    hold_expires_at,
    customer_name,
    customer_email,
    customer_phone,
    notes
  )
  values (
    v_booking_id,
    v_reference,
    p_departure_id,
    p_package_id,
    p_pickup_location_id,
    p_adults,
    p_children,
    p_seniors,
    v_addons,
    v_subtotal_cents,
    v_tax_cents,
    v_total_cents,
    'CAD',
    'pending',
    v_payment_method,
    v_hold_expires_at,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_notes
  )
  -- The token is generated by the column default, which keeps pgcrypto out of
  -- this function's empty `search_path`. The table alias keeps the OUT column
  -- `access_token` from shadowing the table column.
  returning b.access_token into v_access_token;

  return query
    select v_booking_id, v_reference, v_total_cents, v_hold_expires_at, v_access_token;
end;
$$;

revoke execute on function public.reserve_booking(
  uuid, uuid, integer, integer, integer, jsonb, uuid, text, text, text, text, boolean
) from public, anon, authenticated;

grant execute on function public.reserve_booking(
  uuid, uuid, integer, integer, integer, jsonb, uuid, text, text, text, text, boolean
) to service_role;

-- ---------------------------------------------------------------------------
-- Occupancy
-- ---------------------------------------------------------------------------

-- Seats taken by paid bookings, plus pending ones whose hold has not expired. A
-- pending manual booking has no hold deadline and keeps its seats until the
-- owner confirms or cancels it, so it is counted too.
create or replace function public.departure_seats_taken(p_departure_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(b.adults + b.children + b.seniors), 0)::integer
  from public.bookings b
  where b.departure_id = p_departure_id
    and (
      b.status = 'paid'
      or (
        b.status = 'pending'
        and (
          b.payment_method = 'manual'
          or (b.hold_expires_at is not null and b.hold_expires_at > now())
        )
      )
    );
$$;

-- Recreated so the occupancy rule is stated in this migration too. The view
-- reads `departure_seats_taken`, so it inherits the manual-booking rule above.
create or replace view public.departure_availability
with (security_invoker = true)
as
select
  d.id,
  d.tour_id,
  d.starts_at,
  d.capacity,
  d.status,
  coalesce(s.seats_taken, 0) as seats_taken,
  d.capacity - coalesce(s.seats_taken, 0) as seats_left
from public.departures d
cross join lateral (
  select public.departure_seats_taken(d.id) as seats_taken
) s;

-- ---------------------------------------------------------------------------
-- Marking a booking paid
-- ---------------------------------------------------------------------------

-- Called by the Stripe webhook after a paid Checkout session.
--
-- Idempotent: a booking that is already paid returns `changed = false`, so a
-- webhook retry cannot apply the payment twice. A `pending` booking, or one
-- whose hold the cron already expired, becomes paid: a late payment must never
-- be silently lost.
--
-- A payment for a `cancelled` or `refunded` booking cannot change it, but it
-- must not disappear either: `needs_attention = true` tells the webhook to alert
-- the owner so they can refund or reinstate the booking.
--
-- If someone else took the seats in the meantime the payment is still recorded
-- — losing a real payment would be worse than an overbooked van — and
-- `overbooked = true` tells the owner.
drop function if exists public.mark_booking_paid(text, uuid);

create or replace function public.mark_booking_paid(
  p_session_id text,
  p_booking_id uuid
)
returns table (
  changed boolean,
  overbooked boolean,
  needs_attention boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_capacity integer;
  v_other_seats integer;
  v_overbooked boolean := false;
begin
  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  if not found then
    return query select false, false, false;
    return;
  end if;

  select d.capacity into v_capacity
  from public.departures d
  where d.id = v_booking.departure_id;

  -- Seats held by everyone else, exactly as `departure_seats_taken` counts them.
  select coalesce(sum(b.adults + b.children + b.seniors), 0)::integer
  into v_other_seats
  from public.bookings b
  where b.departure_id = v_booking.departure_id
    and b.id <> v_booking.id
    and (
      b.status = 'paid'
      or (
        b.status = 'pending'
        and (
          b.payment_method = 'manual'
          or (b.hold_expires_at is not null and b.hold_expires_at > now())
        )
      )
    );

  v_overbooked := v_capacity is not null
    and v_other_seats + v_booking.adults + v_booking.children + v_booking.seniors > v_capacity;

  -- Recomputing the flag above (rather than only on the first call) keeps the
  -- owner alert marked OVERBOOKED when a webhook retry sends it.
  if v_booking.status not in ('pending', 'expired') then
    -- A cancelled or refunded booking still needs a human: the payment is real
    -- but the booking is not. `paid` is a harmless retry and needs nobody.
    return query select false, v_overbooked, v_booking.status not in ('paid');
    return;
  end if;

  update public.bookings b
  set status = 'paid',
      paid_at = now(),
      stripe_checkout_session_id = coalesce(p_session_id, b.stripe_checkout_session_id)
  where b.id = v_booking.id;

  return query select true, v_overbooked, false;
end;
$$;

revoke execute on function public.mark_booking_paid(text, uuid) from public, anon, authenticated;
grant execute on function public.mark_booking_paid(text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Expiring abandoned holds
-- ---------------------------------------------------------------------------

-- Pending Stripe bookings whose 30-minute hold has run out become `expired`,
-- which releases their seats. Manual bookings have no hold deadline and are
-- never touched. Run by the scheduled worker every 15 minutes.
create or replace function public.expire_holds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired integer;
begin
  update public.bookings
  set status = 'expired'
  where status = 'pending'
    and payment_method = 'stripe'
    and hold_expires_at is not null
    and hold_expires_at <= now();

  get diagnostics v_expired = row_count;
  return v_expired;
end;
$$;

revoke execute on function public.expire_holds() from public, anon, authenticated;
grant execute on function public.expire_holds() to service_role;
