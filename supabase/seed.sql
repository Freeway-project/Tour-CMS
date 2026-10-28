-- Seed data for local development, PGlite tests and a fresh Supabase project.
-- Prices are integer cents (CAD). UUIDs are fixed so tests and fixtures can
-- reference them directly.
--
-- The catalogue is the client's winter offer: one shared day tour and one
-- private tour that is priced per vehicle.

-- ---------------------------------------------------------------------------
-- Tours
-- ---------------------------------------------------------------------------

insert into public.tours (
  id, slug, title, short_description, description, duration_minutes,
  hero_image_path, status, is_private, sort_order
) values
  (
    '0a000000-0000-4000-8000-000000000001',
    'niagara-falls-day-tour',
    'Niagara Falls Day Tour from Toronto',
    'A full day at Niagara Falls from downtown Toronto, with a free maple syrup tasting, the Floral Clock, Whirlpool Rapids and the Niagara Parks Power Station.',
    'We meet at 55 York St in downtown Toronto in the morning and drive to the Canadian side of Niagara Falls. The day starts with a free Canadian maple syrup tasting, then we stop at the Floral Clock, the Whirlpool Rapids and the Niagara Parks Power Station, a historic hydro power station.

We take the scenic Niagara Parkway and stop at beautiful spots for photos along the way, so there is time to enjoy the falls instead of rushing past them.

Want to add an attraction such as the boat cruise or Journey Behind the Falls? Buy it on the day. We''ll help you get your tickets.',
    600, -- TODO confirm with client
    '/images/placeholder-niagara-hero.jpg',
    'active',
    false,
    1
  ),
  (
    '0a000000-0000-4000-8000-000000000002',
    'private-niagara-falls-tour',
    'Private Niagara Falls Tour',
    'A private day at Niagara Falls from downtown Toronto, priced per vehicle. Your group sets the pace.',
    'The same Niagara Falls day, with the vehicle to yourselves. Your group sets the pace: a free Canadian maple syrup tasting, the Floral Clock, the Whirlpool Rapids and the Niagara Parks Power Station, a historic hydro power station, then sightseeing along the Niagara Parkway with stops at beautiful spots for photos.

The price is per vehicle, not per person. Choose the van that fits your group.

Want to add an attraction such as the boat cruise or Journey Behind the Falls? Buy it on the day. We''ll help you get your tickets.',
    600, -- TODO confirm with client
    '/images/placeholder-private-tour-hero.jpg',
    'active',
    true,
    2
  );

-- ---------------------------------------------------------------------------
-- Packages
-- ---------------------------------------------------------------------------

-- Attraction tickets are not included and there are no child or senior rates:
-- a null price falls back to the adult price.
insert into public.packages (
  id, tour_id, name, description, includes,
  price_adult_cents, price_child_cents, price_senior_cents,
  pricing_mode, max_pax, is_active, sort_order
) values
  (
    '0b000000-0000-4000-8000-000000000001',
    '0a000000-0000-4000-8000-000000000001',
    'Day tour',
    'One price per person for the full day out, including every stop listed.',
    array[
      'Free Canadian maple syrup tasting',
      'Floral Clock',
      'Whirlpool Rapids',
      'Niagara Parks Power Station (historic hydro power station)',
      'Sightseeing along the Niagara Parkway',
      'Stops at beautiful spots for photos'
    ],
    9900, null, null,
    'per_person', null, true, 1
  ),
  (
    '0b000000-0000-4000-8000-000000000002',
    '0a000000-0000-4000-8000-000000000002',
    'Sprinter van, up to 6 people',
    'The private tour for groups of up to 6 people, at a flat price for the vehicle.',
    array[
      'Free Canadian maple syrup tasting',
      'Floral Clock',
      'Whirlpool Rapids',
      'Niagara Parks Power Station (historic hydro power station)',
      'Sightseeing along the Niagara Parkway',
      'Stops at beautiful spots for photos'
    ],
    69900, null, null,
    'per_group', 6, true, 1
  ),
  (
    '0b000000-0000-4000-8000-000000000003',
    '0a000000-0000-4000-8000-000000000002',
    'Mercedes-Benz Sprinter, up to 11 people',
    'The private tour for groups of up to 11 people, at a flat price for the vehicle.',
    array[
      'Free Canadian maple syrup tasting',
      'Floral Clock',
      'Whirlpool Rapids',
      'Niagara Parks Power Station (historic hydro power station)',
      'Sightseeing along the Niagara Parkway',
      'Stops at beautiful spots for photos'
    ],
    99900, null, null,
    'per_group', 11, true, 2
  );

-- ---------------------------------------------------------------------------
-- Add-ons
-- ---------------------------------------------------------------------------

-- The `addons` table stays for future extras, but the winter offer has none.

-- ---------------------------------------------------------------------------
-- Pickup locations
-- ---------------------------------------------------------------------------

insert into public.pickup_locations (id, name, address, lat, lng, pickup_note, is_active) values
  (
    '0d000000-0000-4000-8000-000000000001',
    '55 York St, downtown Toronto',
    '55 York St, Toronto, ON M5J 1R7',
    43.6455,
    -79.3825,
    null,
    true
  );

-- ---------------------------------------------------------------------------
-- Tour pickups
-- ---------------------------------------------------------------------------

insert into public.tour_pickups (tour_id, pickup_location_id, pickup_time) values
  ('0a000000-0000-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000001', '07:45'), -- TODO confirm
  ('0a000000-0000-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000001', '07:45'); -- TODO confirm

-- ---------------------------------------------------------------------------
-- Departures: the next 30 days, 08:00 Toronto time, capacity 11
-- ---------------------------------------------------------------------------

-- Private tours are requested through the inquiry form, so only the shared day
-- tour gets scheduled departures.
insert into public.departures (tour_id, starts_at, capacity, status)
select
  '0a000000-0000-4000-8000-000000000001',
  ((current_date + n)::date + time '08:00') at time zone 'America/Toronto',
  11, -- TODO confirm
  'open'
from generate_series(1, 30) as n;
