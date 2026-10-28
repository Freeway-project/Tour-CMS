-- Group (private vehicle) pricing.
--
-- A `per_person` package is charged per passenger, as before. A `per_group`
-- package is charged once for the whole vehicle: `price_adult_cents` is the flat
-- price for the group and `max_pax` is how many people fit in that vehicle.
-- Private tours are requested through the inquiry form, so `reserve_booking`
-- refuses to book them directly.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.packages
  add column pricing_mode text not null default 'per_person'
    check (pricing_mode in ('per_person', 'per_group')),
  add column max_pax integer null check (max_pax is null or max_pax > 0);

-- A flat group price is meaningless without a group size to go with it.
alter table public.packages
  add constraint packages_per_group_max_pax_check
  check (pricing_mode <> 'per_group' or max_pax is not null);

-- The customer can say which vehicle they want on the inquiry form.
alter table public.inquiries
  add column package_id uuid null references public.packages (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Booking
-- ---------------------------------------------------------------------------

-- Same signature, security settings and grants as in `0001_init.sql`, plus the
-- `private_tour_inquiry_only` guard for per-group (private) packages.
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
  p_notes text
)
returns table (
  booking_id uuid,
  reference text,
  total_cents integer,
  hold_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_departure public.departures%rowtype;
  v_package public.packages%rowtype;
  v_addon public.addons%rowtype;
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
  v_hold_expires_at timestamptz := now() + interval '15 minutes';
  v_addons jsonb := '[]'::jsonb;
  v_booking_id uuid := gen_random_uuid();
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

      select a.* into v_addon
      from public.addons a
      where a.id = (v_item ->> 'addon_id')::uuid;

      if not found
         or v_addon.tour_id <> v_departure.tour_id
         or not v_addon.is_active then
        raise exception 'addon_not_available';
      end if;

      v_quantity := greatest(coalesce((v_item ->> 'quantity')::integer, 1), 0);

      if v_addon.pricing = 'per_booking' then
        v_quantity := case when v_quantity > 0 then 1 else 0 end;
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

  insert into public.bookings (
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
    v_hold_expires_at,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_notes
  );

  return query select v_booking_id, v_reference, v_total_cents, v_hold_expires_at;
end;
$$;

revoke execute on function public.reserve_booking(
  uuid, uuid, integer, integer, integer, jsonb, uuid, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.reserve_booking(
  uuid, uuid, integer, integer, integer, jsonb, uuid, text, text, text, text
) to service_role;
