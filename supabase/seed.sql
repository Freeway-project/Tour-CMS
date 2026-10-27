-- Seed data for local development, PGlite tests and a fresh Supabase project.
-- Prices are integer cents (CAD). UUIDs are fixed so tests and fixtures can
-- reference them directly.

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
    'A full day at Niagara Falls with a Hornblower cruise, a local guide and round-trip pickup from downtown Toronto.',
    'We pick you up in downtown Toronto in the morning and drive straight to the Canadian side of Niagara Falls. Your guide handles the tickets, the timing and the best viewpoints.

The Hornblower cruise takes you to the base of Horseshoe Falls — expect to get wet. After lunch there is free time at Table Rock, a scenic drive along the Niagara Parkway and a short stop in Niagara-on-the-Lake before we head back to the city.',
    600,
    '/images/placeholder-niagara-hero.jpg',
    'active',
    false,
    1
  ),
  (
    '0a000000-0000-4000-8000-000000000002',
    'niagara-falls-evening-fireworks',
    'Niagara Falls Evening Tour with Fireworks',
    'See the falls light up after dark, then watch the summer fireworks from the best spot on the Canadian side.',
    'This evening trip leaves Toronto in the late afternoon and arrives at Niagara Falls just as the lights come on. Your guide takes you to the best viewpoints for the illuminated falls, then settles in for the fireworks display over the gorge.

There is time for dinner on your own near Table Rock before the show. The tour runs on fireworks nights from May to October and returns to Toronto around 11:00 PM.',
    420,
    '/images/placeholder-fireworks-hero.jpg',
    'seasonal',
    false,
    2
  ),
  (
    '0a000000-0000-4000-8000-000000000003',
    'niagara-wine-country-tour',
    'Niagara-on-the-Lake Wine Country Tour',
    'Taste your way through Niagara-on-the-Lake with three winery visits, a vineyard lunch and a guided walk through town.',
    'The Niagara Peninsula is one of Canada’s best wine regions, and this small-group tour introduces you to three very different wineries. Tastings are included at each stop, from crisp Rieslings to the region’s famous icewine.

Between tastings there is time for lunch overlooking the vines and a guided walk through the shops and gardens of Niagara-on-the-Lake. This tour is for adults 19 and over.',
    480,
    '/images/placeholder-wine-hero.jpg',
    'active',
    false,
    3
  );

-- ---------------------------------------------------------------------------
-- Packages
-- ---------------------------------------------------------------------------

insert into public.packages (
  id, tour_id, name, description, includes,
  price_adult_cents, price_child_cents, price_senior_cents, is_active, sort_order
) values
  (
    '0b000000-0000-4000-8000-000000000001',
    '0a000000-0000-4000-8000-000000000001',
    'Bus only',
    'Round-trip transport from Toronto with free time at the falls.',
    array['Round-trip transport', 'Local guide', 'Free time at Table Rock'],
    9900, 7920, null, true, 1
  ),
  (
    '0b000000-0000-4000-8000-000000000002',
    '0a000000-0000-4000-8000-000000000001',
    '+ Boat cruise',
    'The bus tour plus a Hornblower cruise to the base of Horseshoe Falls.',
    array['Round-trip transport', 'Local guide', 'Hornblower cruise ticket'],
    15900, 12720, null, true, 2
  ),
  (
    '0b000000-0000-4000-8000-000000000003',
    '0a000000-0000-4000-8000-000000000001',
    '+ Boat & Journey Behind the Falls',
    'Both boat and tunnel experiences, with a poncho for each.',
    array['Round-trip transport', 'Local guide', 'Hornblower cruise ticket', 'Journey Behind the Falls ticket'],
    20900, 16720, null, true, 3
  ),
  (
    '0b000000-0000-4000-8000-000000000004',
    '0a000000-0000-4000-8000-000000000002',
    'Evening tour',
    'Evening transport, guide and a reserved fireworks viewing spot.',
    array['Round-trip transport', 'Local guide', 'Fireworks viewing spot'],
    15900, 12900, null, true, 1
  ),
  (
    '0b000000-0000-4000-8000-000000000005',
    '0a000000-0000-4000-8000-000000000003',
    'Wine country tour',
    'Three tastings, a vineyard lunch and a guided walk in town.',
    array['Round-trip transport', 'Three wine tastings', 'Vineyard lunch'],
    18900, null, null, true, 1
  );

-- ---------------------------------------------------------------------------
-- Add-ons
-- ---------------------------------------------------------------------------

insert into public.addons (
  id, tour_id, name, description, price_cents, pricing, is_active, sort_order
) values
  (
    '0c000000-0000-4000-8000-000000000001',
    '0a000000-0000-4000-8000-000000000001',
    'Lunch at Table Rock',
    'A set lunch at the Table Rock market, paid when you book.',
    2500,
    'per_person',
    true,
    1
  ),
  (
    '0c000000-0000-4000-8000-000000000002',
    '0a000000-0000-4000-8000-000000000001',
    'Airport drop-off',
    'Drop-off at Toronto Pearson at the end of the day, per booking.',
    6000,
    'per_booking',
    true,
    2
  );

-- ---------------------------------------------------------------------------
-- Pickup locations
-- ---------------------------------------------------------------------------

insert into public.pickup_locations (id, name, address, lat, lng, pickup_note, is_active) values
  (
    '0d000000-0000-4000-8000-000000000001',
    'Union Station – Front St entrance',
    '65 Front Street West, Toronto, ON M5J 1E6',
    43.6453,
    -79.3806,
    'Wait by the taxi stand on Front Street, under the station clock.',
    true
  ),
  (
    '0d000000-0000-4000-8000-000000000002',
    'Chelsea Hotel, Toronto',
    '33 Gerrard Street West, Toronto, ON M5G 1Z4',
    43.6602,
    -79.3835,
    'Meet the bus at the main entrance on Gerrard Street.',
    true
  ),
  (
    '0d000000-0000-4000-8000-000000000003',
    'Fairmont Royal York',
    '100 Front Street West, Toronto, ON M5J 1E3',
    43.6457,
    -79.3815,
    'Use the Front Street entrance, opposite Union Station.',
    true
  ),
  (
    '0d000000-0000-4000-8000-000000000004',
    'North York Centre – Yonge St',
    '5150 Yonge Street, Toronto, ON M2N 6L8',
    43.7695,
    -79.4131,
    'Meet outside the library entrance, north of Mel Lastman Square.',
    true
  );

-- ---------------------------------------------------------------------------
-- Tour pickups
-- ---------------------------------------------------------------------------

insert into public.tour_pickups (tour_id, pickup_location_id, pickup_time) values
  ('0a000000-0000-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000001', '07:15'),
  ('0a000000-0000-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000002', '07:25'),
  ('0a000000-0000-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000003', '07:30'),
  ('0a000000-0000-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000004', '08:00'),
  ('0a000000-0000-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000001', '16:00'),
  ('0a000000-0000-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000002', '16:15'),
  ('0a000000-0000-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000003', '16:10'),
  ('0a000000-0000-4000-8000-000000000003', '0d000000-0000-4000-8000-000000000001', '09:00'),
  ('0a000000-0000-4000-8000-000000000003', '0d000000-0000-4000-8000-000000000002', '09:10'),
  ('0a000000-0000-4000-8000-000000000003', '0d000000-0000-4000-8000-000000000003', '09:05');

-- ---------------------------------------------------------------------------
-- Departures: the next 30 days, 08:00 Toronto time, capacity 7
-- ---------------------------------------------------------------------------

insert into public.departures (tour_id, starts_at, capacity, status)
select
  t.id,
  ((current_date + n)::date + time '08:00') at time zone 'America/Toronto',
  7,
  'open'
from public.tours t
cross join generate_series(1, 30) as n;
