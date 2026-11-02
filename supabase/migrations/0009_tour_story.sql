-- Task 09: the facts the redesigned pages put at the top. Everything here is
-- written by the owner in /admin; empty values hide their section.

-- Group limit shown as "Max N guests". Visitors cannot read `schedules`, so the
-- public number lives on the tour. Private tours leave it null and use each
-- package's `max_pax` instead.
alter table public.tours
  add column max_guests integer check (max_guests is null or max_guests > 0),
  -- Timed day: [{ "time": "08:00", "title": "...", "detail": "..." | null }]
  add column itinerary jsonb not null default '[]'::jsonb
    check (jsonb_typeof(itinerary) = 'array'),
  add column excludes text[] not null default '{}';

-- Existing projects: start from the capacity the owner already set on the
-- shared tour's active schedules.
update public.tours t
set max_guests = (
  select max(s.capacity) from public.schedules s
  where s.tour_id = t.id and s.is_active
)
where not t.is_private and t.max_guests is null;

-- "Meet your guide / your vehicle". A photo is null or
-- { "path": "site/…", "width": int, "height": int, "alt": text }, with the path
-- in the public `tour-images` bucket; width and height prevent layout shift.
alter table public.site_settings
  add column guide_name text not null default '',
  add column guide_bio text not null default '',
  add column guide_photo jsonb check (guide_photo is null or jsonb_typeof(guide_photo) = 'object'),
  add column vehicle_text text not null default '',
  add column vehicle_photo jsonb check (vehicle_photo is null or jsonb_typeof(vehicle_photo) = 'object');
