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
  hero_image_path, status, is_private, sort_order, highlights, important_info
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
    1,
    array[
      'Free Canadian maple syrup tasting',
      'Photo stop at the Floral Clock',
      'Whirlpool Rapids viewpoint',
      'Niagara Parks Power Station',
      'Scenic drive along the Niagara Parkway'
    ],
    'Attraction tickets aren''t included. We''ll help you buy them on the day.'
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
    2,
    array[
      'The vehicle to yourselves all day',
      'Free Canadian maple syrup tasting',
      'Photo stop at the Floral Clock',
      'Niagara Parks Power Station',
      'Scenic drive along the Niagara Parkway'
    ],
    'Attraction tickets aren''t included. We''ll help you buy them on the day.'
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
-- Tour photos
-- ---------------------------------------------------------------------------

-- No photos have been uploaded yet, so the public pages use the placeholder
-- hero paths in `tours.hero_image_path` until the owner adds some in /admin.

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
-- Departures: every day at 08:00 Toronto time, capacity 11, for 120 days
-- ---------------------------------------------------------------------------

-- Private tours are requested through the inquiry form, so only the shared day
-- tour gets a schedule.
insert into public.schedules (id, tour_id, weekdays, start_time, capacity, valid_from, is_active)
values (
  '0e000000-0000-4000-8000-000000000001',
  '0a000000-0000-4000-8000-000000000001',
  array[0, 1, 2, 3, 4, 5, 6],
  '08:00',
  11, -- TODO confirm
  current_date,
  true
);

-- The daily cron repeats this; running it here gives a fresh database its
-- calendar immediately.
select public.generate_departures();

-- ---------------------------------------------------------------------------
-- Site settings
-- ---------------------------------------------------------------------------

insert into public.site_settings (
  id, name, tagline, phone, whatsapp, email, address, hst_number,
  cancellation_policy, privacy_policy, terms,
  announcement_enabled, announcement_text, announcement_href, ratings
) values (
  1,
  'Toronto Niagara Tours',
  'Small-group Niagara Falls day tours from Toronto',
  'TODO: +1 (416) 555-0142',
  'TODO: +1 (416) 555-0142',
  'hello@torontoniagara.example',
  'TODO: 65 Front Street West, Toronto, ON M5J 1E6, Canada',
  'TODO: HST registration number',
  'TODO: confirm the cancellation window with the owner. Placeholder: free cancellation up to 24 hours before departure.',
  'TODO: the owner writes the privacy policy in /admin/settings.',
  'TODO: the owner writes the terms and conditions in /admin/settings.',
  false,
  'TODO: announcement text',
  null,
  '[
    {"platform": "TODO: Google", "score": 4.9, "count": 0, "url": "https://example.com/todo-google-reviews"},
    {"platform": "TODO: Tripadvisor", "score": 4.8, "count": 0, "url": "https://example.com/todo-tripadvisor-reviews"}
  ]'::jsonb
);

-- ---------------------------------------------------------------------------
-- FAQs
-- ---------------------------------------------------------------------------

insert into public.faqs (id, question, answer, tour_id, sort_order, is_active) values
  (
    '0f000000-0000-4000-8000-000000000001',
    'What happens if it rains?',
    'We run in the rain, snow and shine — the vehicle is heated and the falls are just as impressive in bad weather. The only exception is a severe weather warning from Environment Canada, in which case we reschedule you for free or refund you in full.

Bring a light rain jacket if the forecast looks wet.',
    null, 1, true
  ),
  (
    '0f000000-0000-4000-8000-000000000002',
    'When does the boat cruise run?',
    'The boat cruise usually runs from early May to late November. Attraction tickets are not included in our price, so you add them on the day — and in the winter months Journey Behind the Falls is the better option. We''ll help you get your tickets either way.',
    null, 2, true
  ),
  (
    '0f000000-0000-4000-8000-000000000003',
    'Do I need a passport?',
    'No. The whole tour stays on the Canadian side of the border, so a passport is not required — even for US citizens. Bring photo ID if you would like it for the boat, but it is not checked.',
    null, 3, true
  ),
  (
    '0f000000-0000-4000-8000-000000000004',
    'Is the tour suitable for children?',
    'Yes. Children are welcome. Child and senior prices are not set for this season, so everyone pays the same price.

Private tours are a good choice for larger families: the whole vehicle is yours for the day.',
    null, 4, true
  ),
  (
    '0f000000-0000-4000-8000-000000000005',
    'Do you accommodate wheelchairs and strollers?',
    'Our vans have space for one folding wheelchair or two strollers, but please tell us when you book so we can keep it free. The Table Rock centre and the boat are wheelchair accessible. Some viewpoints along the Niagara Parkway are gravel, so a companion is helpful.',
    null, 5, true
  ),
  (
    '0f000000-0000-4000-8000-000000000006',
    'Can I cancel my booking?',
    'You can cancel free of charge up to 24 hours before your departure and we refund the full amount. Inside 24 hours the full price applies because we hold your seats and pickups.

To cancel, reply to your confirmation email with your booking reference.',
    null, 6, true
  ),
  (
    '0f000000-0000-4000-8000-000000000007',
    'What should I bring?',
    'Comfortable shoes, a light rain jacket, sunscreen and a refillable water bottle. The boat cruise gets you close enough to the falls to feel the spray, so a dry layer is a good idea even on a sunny day.

Leave large luggage at your hotel — there is limited space on the bus.',
    null, 7, true
  ),
  (
    '0f000000-0000-4000-8000-000000000008',
    'Where do you pick up?',
    'We pick up at 55 York St in downtown Toronto, a short walk from Union Station. Arrive five minutes early — the vehicle cannot wait past its slot.',
    null, 8, true
  );

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------

insert into public.reviews (
  id, author, location, rating, text, review_date, source, tour_id, featured, is_active, sort_order
) values
  (
    '0e100000-0000-4000-8000-000000000001',
    'Sarah M.', 'Chicago, USA', 5,
    'The whole day ran like clockwork. Our guide knew exactly when to beat the crowds at the falls and the boat ride was the highlight of our trip.',
    '2026-08-14', 'google', null, true, true, 1
  ),
  (
    '0e100000-0000-4000-8000-000000000002',
    'James T.', 'Toronto, Canada', 5,
    'Picked up at 55 York St and back in time for dinner. Small group, no queues and a guide who actually made the drive interesting.',
    '2026-07-22', 'tripadvisor', null, true, true, 2
  ),
  (
    '0e100000-0000-4000-8000-000000000003',
    'Priya K.', 'Mississauga, Canada', 4,
    'Great value for a full day out. The free time in Niagara-on-the-Lake was a little short, but the cruise and the guide more than made up for it.',
    '2026-06-30', 'google', null, true, true, 3
  ),
  (
    '0e100000-0000-4000-8000-000000000004',
    'Daniel R.', 'Buffalo, USA', 5,
    'Booked the private tour for our anniversary and had the day to ourselves. Watching the falls from the Parkway with nobody rushing us was unforgettable.',
    '2026-09-05', 'direct', '0a000000-0000-4000-8000-000000000002', false, true, 4
  ),
  (
    '0e100000-0000-4000-8000-000000000005',
    'Emma L.', 'London, UK', 5,
    'The maple syrup tasting was a lovely surprise and the driver-guide really knew the region. Easily the best day of our two weeks in Ontario.',
    '2026-05-18', 'tripadvisor', null, true, true, 5
  ),
  (
    '0e100000-0000-4000-8000-000000000006',
    'Marc G.', 'Montreal, Canada', 4,
    'Comfortable bus and a friendly driver. The itinerary was well paced, though we would have liked more time at the whirlpool.',
    '2026-08-02', 'direct', null, false, true, 6
  ),
  (
    '0e100000-0000-4000-8000-000000000007',
    'Olivia P.', 'Hamilton, Canada', 5,
    'Took my parents for their first trip to the falls. Pickup was on time, everything was organised and the guide was patient with my dad''s questions.',
    '2026-07-11', 'google', null, true, true, 7
  ),
  (
    '0e100000-0000-4000-8000-000000000008',
    'Noah W.', 'Ottawa, Canada', 5,
    'The day was relaxed and never felt rushed. The stops along the Niagara Parkway were well chosen, which made the price feel good value.',
    '2026-09-27', 'tripadvisor', null, false, true, 8
  );
