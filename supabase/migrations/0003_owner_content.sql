-- Owner-editable content, recurring schedules and tour photos.
--
-- Everything a customer can read about the business now lives in Supabase so
-- the owner can change it in `/admin`: site settings, FAQs, reviews and tour
-- photos. Departures are generated from weekly schedules instead of being
-- typed one date at a time.

-- ---------------------------------------------------------------------------
-- Site settings (a single row)
-- ---------------------------------------------------------------------------

create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  name text not null,
  tagline text not null,
  phone text not null,
  whatsapp text not null,
  email text not null,
  address text not null,
  hst_number text,
  cancellation_policy text not null default '',
  announcement_enabled boolean not null default false,
  announcement_text text not null default '',
  announcement_href text,
  ratings jsonb not null default '[]'::jsonb check (jsonb_typeof(ratings) = 'array'),
  -- Last time a rebuild was requested, used to rate-limit the deploy hook.
  last_publish_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- FAQs
-- ---------------------------------------------------------------------------

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  -- Null means the FAQ is shown on every tour.
  tour_id uuid references public.tours (id) on delete cascade,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index faqs_tour_id_idx on public.faqs (tour_id);
create index faqs_sort_order_idx on public.faqs (sort_order);

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  location text,
  rating integer not null check (rating between 1 and 5),
  text text not null,
  review_date date not null,
  source text not null check (source in ('google', 'tripadvisor', 'viator', 'direct')),
  -- Null means the review is shown on every tour.
  tour_id uuid references public.tours (id) on delete cascade,
  featured boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_tour_id_idx on public.reviews (tour_id);
create index reviews_review_date_idx on public.reviews (review_date);

-- ---------------------------------------------------------------------------
-- Tour photos
-- ---------------------------------------------------------------------------

create table public.tour_images (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours (id) on delete cascade,
  /** Path inside the public `tour-images` Storage bucket. */
  storage_path text not null,
  alt text not null check (length(trim(alt)) > 0),
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  sort_order integer not null default 0,
  is_hero boolean not null default false,
  created_at timestamptz not null default now()
);

create index tour_images_tour_id_idx on public.tour_images (tour_id, sort_order);

-- At most one hero per tour.
create unique index tour_images_one_hero_idx
  on public.tour_images (tour_id)
  where is_hero;

-- ---------------------------------------------------------------------------
-- Extra tour fields
-- ---------------------------------------------------------------------------

alter table public.tours
  add column highlights text[] not null default '{}',
  add column important_info text;

-- ---------------------------------------------------------------------------
-- Recurring schedules and blackout dates
-- ---------------------------------------------------------------------------

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours (id) on delete cascade,
  /** 0 = Sunday … 6 = Saturday. */
  weekdays integer[] not null
    check (array_length(weekdays, 1) > 0 and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]),
  start_time time not null,
  capacity integer not null check (capacity > 0),
  valid_from date not null default current_date,
  valid_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint schedules_valid_range_check check (valid_to is null or valid_to >= valid_from)
);

create index schedules_tour_id_idx on public.schedules (tour_id);

create table public.blackout_dates (
  id uuid primary key default gen_random_uuid(),
  -- Null means every tour is closed that date.
  tour_id uuid references public.tours (id) on delete cascade,
  date date not null,
  reason text,
  created_at timestamptz not null default now()
);

-- `nulls not distinct` is not available on older Postgres, so the null tour is
-- folded to the nil UUID in a unique expression index.
create unique index blackout_dates_unique_idx
  on public.blackout_dates (coalesce(tour_id, '00000000-0000-0000-0000-000000000000'::uuid), date);

-- ---------------------------------------------------------------------------
-- Generate departures from active schedules
-- ---------------------------------------------------------------------------

-- Creates any missing departures for the next `p_days` days (Toronto time).
-- Existing departures are never changed or deleted: they may have bookings, and
-- the (tour_id, starts_at) unique key makes the insert idempotent.
create or replace function public.generate_departures(p_days integer default 120)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'America/Toronto')::date;
  v_inserted integer := 0;
begin
  with targets as (
    select
      s.tour_id,
      (v_today + day_offset)::date as local_date,
      -- Build the wall-clock time in Toronto, so the UTC instant follows the
      -- DST change instead of drifting by an hour.
      (((v_today + day_offset)::date + s.start_time) at time zone 'America/Toronto') as starts_at,
      s.capacity
    from public.schedules s
    cross join generate_series(1, p_days) as day_offset
    where s.is_active
      and extract(dow from (v_today + day_offset)::date)::integer = any (s.weekdays)
      and (v_today + day_offset)::date >= s.valid_from
      and (s.valid_to is null or (v_today + day_offset)::date <= s.valid_to)
  )
  insert into public.departures (tour_id, starts_at, capacity, status)
  select t.tour_id, t.starts_at, t.capacity, 'open'
  from targets t
  where not exists (
      select 1
      from public.blackout_dates b
      where b.date = t.local_date
        and (b.tour_id is null or b.tour_id = t.tour_id)
    )
    and not exists (
      select 1
      from public.departures d
      where d.tour_id = t.tour_id and d.starts_at = t.starts_at
    )
  on conflict (tour_id, starts_at) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

revoke execute on function public.generate_departures(integer) from public, anon, authenticated;
grant execute on function public.generate_departures(integer) to service_role;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

create trigger faqs_set_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.site_settings enable row level security;
alter table public.faqs enable row level security;
alter table public.reviews enable row level security;
alter table public.tour_images enable row level security;
alter table public.schedules enable row level security;
alter table public.blackout_dates enable row level security;

-- Public read: everything a marketing page needs, active rows only.
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated
  using (true);

create policy faqs_public_read on public.faqs
  for select to anon, authenticated
  using (is_active);

create policy reviews_public_read on public.reviews
  for select to anon, authenticated
  using (is_active);

create policy tour_images_public_read on public.tour_images
  for select to anon, authenticated
  using (true);

-- Admins: full access (the admin UI uses the owner's own session, so RLS is
-- what keeps writes limited to admins).
create policy site_settings_admin_all on public.site_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy faqs_admin_all on public.faqs
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy reviews_admin_all on public.reviews
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy tour_images_admin_all on public.tour_images
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy schedules_admin_all on public.schedules
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy blackout_dates_admin_all on public.blackout_dates
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant select on public.site_settings, public.faqs, public.reviews, public.tour_images
  to anon, authenticated;

-- Schedules and blackout dates are an admin concern: no anonymous access at all.
revoke all on public.schedules, public.blackout_dates from anon, authenticated;

grant all on public.site_settings, public.faqs, public.reviews, public.tour_images,
  public.schedules, public.blackout_dates to service_role;

-- ---------------------------------------------------------------------------
-- Storage: public read, admin-only write
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('tour-images', 'tour-images', true)
on conflict (id) do nothing;

create policy tour_images_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'tour-images');

create policy tour_images_admin_write on storage.objects
  for all to authenticated
  using (bucket_id = 'tour-images' and public.is_admin())
  with check (bucket_id = 'tour-images' and public.is_admin());
