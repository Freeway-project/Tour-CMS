-- Tour CMS initial schema.
--
-- Plain Postgres, compatible with Supabase. All money is integer cents (CAD),
-- all timestamps are timestamptz. The `auth` schema and the anon/authenticated/
-- service_role roles are provided by Supabase; `supabase/tests/supabase-stub.sql`
-- creates them for local PGlite tests.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.tours (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text not null,
  description text not null,
  duration_minutes integer not null check (duration_minutes > 0),
  hero_image_path text not null,
  status text not null default 'active' check (status in ('active', 'seasonal', 'hidden')),
  is_private boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours (id) on delete cascade,
  name text not null,
  description text,
  includes text[] not null default '{}',
  price_adult_cents integer not null check (price_adult_cents >= 0),
  price_child_cents integer check (price_child_cents >= 0),
  price_senior_cents integer check (price_senior_cents >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create index packages_tour_id_idx on public.packages (tour_id);

create table public.addons (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours (id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  pricing text not null check (pricing in ('per_person', 'per_booking')),
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create index addons_tour_id_idx on public.addons (tour_id);

create table public.pickup_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  pickup_note text,
  is_active boolean not null default true
);

create table public.tour_pickups (
  tour_id uuid not null references public.tours (id) on delete cascade,
  pickup_location_id uuid not null references public.pickup_locations (id) on delete cascade,
  pickup_time time not null,
  primary key (tour_id, pickup_location_id)
);

create table public.departures (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours (id) on delete cascade,
  starts_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled')),
  unique (tour_id, starts_at)
);

create index departures_tour_starts_at_idx on public.departures (tour_id, starts_at);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  departure_id uuid not null references public.departures (id),
  package_id uuid not null references public.packages (id),
  pickup_location_id uuid references public.pickup_locations (id),
  adults integer not null default 0 check (adults >= 0),
  children integer not null default 0 check (children >= 0),
  seniors integer not null default 0 check (seniors >= 0),
  addons jsonb not null default '[]'::jsonb check (jsonb_typeof(addons) = 'array'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  tax_cents integer not null check (tax_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'CAD',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled', 'expired', 'refunded')),
  hold_expires_at timestamptz,
  customer_name text,
  customer_email text,
  customer_phone text,
  notes text,
  stripe_checkout_session_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_passenger_count_check check (adults + children + seniors > 0)
);

create index bookings_departure_id_idx on public.bookings (departure_id);
create index bookings_pending_hold_idx on public.bookings (departure_id, hold_expires_at)
  where status = 'pending';

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references public.tours (id) on delete set null,
  preferred_date date,
  group_size integer check (group_size > 0),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger tours_set_updated_at
  before update on public.tours
  for each row execute function public.set_updated_at();

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Occupancy
-- ---------------------------------------------------------------------------

-- Seats taken by paid bookings, plus pending ones whose 15-minute hold has not
-- expired. `security definer` so anonymous visitors can read the availability
-- view without being able to read the bookings table itself.
create function public.departure_seats_taken(p_departure_id uuid)
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
      or (b.status = 'pending' and b.hold_expires_at is not null and b.hold_expires_at > now())
    );
$$;

create view public.departure_availability
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
-- Admin check
-- ---------------------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Booking
-- ---------------------------------------------------------------------------

-- Creates a pending booking and holds its seats for 15 minutes. Every price is
-- read from the database: the arguments only say who is coming and which
-- package/add-ons they picked.
create function public.reserve_booking(
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

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.tours enable row level security;
alter table public.packages enable row level security;
alter table public.addons enable row level security;
alter table public.pickup_locations enable row level security;
alter table public.tour_pickups enable row level security;
alter table public.departures enable row level security;
alter table public.bookings enable row level security;
alter table public.inquiries enable row level security;
alter table public.admins enable row level security;

-- Catalogue: anonymous visitors can read only what is public.
create policy tours_public_read on public.tours
  for select to anon, authenticated
  using (status <> 'hidden');

create policy packages_public_read on public.packages
  for select to anon, authenticated
  using (is_active);

create policy addons_public_read on public.addons
  for select to anon, authenticated
  using (is_active);

create policy pickup_locations_public_read on public.pickup_locations
  for select to anon, authenticated
  using (is_active);

create policy tour_pickups_public_read on public.tour_pickups
  for select to anon, authenticated
  using (true);

create policy departures_public_read on public.departures
  for select to anon, authenticated
  using (status = 'open' and starts_at > now());

-- Admins: full access to every table.
create policy tours_admin_all on public.tours
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy packages_admin_all on public.packages
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy addons_admin_all on public.addons
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy pickup_locations_admin_all on public.pickup_locations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy tour_pickups_admin_all on public.tour_pickups
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy departures_admin_all on public.departures
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy bookings_admin_all on public.bookings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy inquiries_admin_all on public.inquiries
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy admins_admin_all on public.admins
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- No policies for anon/authenticated on bookings, inquiries or admins: those
-- tables are unreachable except through the security-definer function above or
-- an admin session.

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

grant select on public.tours, public.packages, public.addons,
  public.pickup_locations, public.tour_pickups, public.departures
  to anon, authenticated;

grant select on public.departure_availability to anon, authenticated;

revoke all on public.bookings, public.inquiries, public.admins from anon, authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
