import type { Departure, Faq, Package, PickupLocation, Review, SiteSettings, Tour } from '../lib/types';

/**
 * Fixture catalogue used whenever Supabase is not configured (no `.env`).
 *
 * Everything here mirrors `supabase/seed.sql`: the client's winter offer, one
 * shared day tour and one private tour priced per vehicle. The admin UI edits
 * the real rows in Supabase.
 */

const FIXTURE_DEPARTURE_DAYS = 30;
const FIXTURE_CAPACITY = 11; // TODO confirm with client

function pickupTime(location: PickupLocation, time: string): PickupLocation {
  return { ...location, pickupTime: time };
}

// --- Pickup locations ------------------------------------------------------

const yorkStreet: PickupLocation = {
  id: 'pickup-55-york-st',
  name: '55 York St, downtown Toronto',
  address: '55 York St, Toronto, ON M5J 1R7',
  lat: 43.6455,
  lng: -79.3825,
  pickupNote: null,
  isActive: true,
  pickupTime: null,
};

export const pickupLocations: PickupLocation[] = [yorkStreet];

// --- Shared package content ------------------------------------------------

const dayTourIncludes = [
  'Free Canadian maple syrup tasting',
  'Floral Clock',
  'Whirlpool Rapids',
  'Niagara Parks Power Station (historic hydro power station)',
  'Sightseeing along the Niagara Parkway',
  'Stops at beautiful spots for photos',
];

// --- Niagara Falls day tour ------------------------------------------------

const dayTourId = 'tour-niagara-falls-day';

const dayTourPackages: Package[] = [
  {
    id: 'package-day-tour',
    tourId: dayTourId,
    name: 'Day tour',
    description: 'One price per person for the full day out, including every stop listed.',
    includes: dayTourIncludes,
    priceAdultCents: 9900,
    priceChildCents: null,
    priceSeniorCents: null,
    pricingMode: 'per_person',
    maxPax: null,
    isActive: true,
    sortOrder: 1,
  },
];

const niagaraDayTour: Tour = {
  id: dayTourId,
  slug: 'niagara-falls-day-tour',
  title: 'Niagara Falls Day Tour from Toronto',
  shortDescription:
    'A full day at Niagara Falls from downtown Toronto, with a free maple syrup tasting, the Floral Clock, Whirlpool Rapids and the Niagara Parks Power Station.',
  description:
    'We meet at 55 York St in downtown Toronto in the morning and drive to the Canadian side of Niagara Falls. The day starts with a free Canadian maple syrup tasting, then we stop at the Floral Clock, the Whirlpool Rapids and the Niagara Parks Power Station, a historic hydro power station.\n\nWe take the scenic Niagara Parkway and stop at beautiful spots for photos along the way, so there is time to enjoy the falls instead of rushing past them.\n\nWant to add an attraction such as the boat cruise or Journey Behind the Falls? Buy it on the day. We’ll help you get your tickets.',
  durationMinutes: 600,
  heroImagePath: '/images/placeholder-niagara-hero.jpg',
  status: 'active',
  isPrivate: false,
  sortOrder: 1,
  highlights: [
    'Free Canadian maple syrup tasting',
    'Photo stop at the Floral Clock',
    'Whirlpool Rapids viewpoint',
    'Niagara Parks Power Station',
    'Scenic drive along the Niagara Parkway',
  ],
  importantInfo: 'Attraction tickets aren’t included. We’ll help you buy them on the day.',
  packages: dayTourPackages,
  addons: [],
  pickups: [pickupTime(yorkStreet, '07:45')],
};

// --- Private Niagara Falls tour --------------------------------------------

const privateTourId = 'tour-private-niagara-falls';

const privateTourPackages: Package[] = [
  {
    id: 'package-private-van-6',
    tourId: privateTourId,
    name: 'Sprinter van, up to 6 people',
    description: 'The private tour for groups of up to 6 people, at a flat price for the vehicle.',
    includes: dayTourIncludes,
    priceAdultCents: 69900,
    priceChildCents: null,
    priceSeniorCents: null,
    pricingMode: 'per_group',
    maxPax: 6,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'package-private-van-11',
    tourId: privateTourId,
    name: 'Mercedes-Benz Sprinter, up to 11 people',
    description: 'The private tour for groups of up to 11 people, at a flat price for the vehicle.',
    includes: dayTourIncludes,
    priceAdultCents: 99900,
    priceChildCents: null,
    priceSeniorCents: null,
    pricingMode: 'per_group',
    maxPax: 11,
    isActive: true,
    sortOrder: 2,
  },
];

const niagaraPrivateTour: Tour = {
  id: privateTourId,
  slug: 'private-niagara-falls-tour',
  title: 'Private Niagara Falls Tour',
  shortDescription:
    'A private day at Niagara Falls from downtown Toronto, priced per vehicle. Your group sets the pace.',
  description:
    'The same Niagara Falls day, with the vehicle to yourselves. Your group sets the pace: a free Canadian maple syrup tasting, the Floral Clock, the Whirlpool Rapids and the Niagara Parks Power Station, a historic hydro power station, then sightseeing along the Niagara Parkway with stops at beautiful spots for photos.\n\nThe price is per vehicle, not per person. Choose the van that fits your group.\n\nWant to add an attraction such as the boat cruise or Journey Behind the Falls? Buy it on the day. We’ll help you get your tickets.',
  durationMinutes: 600,
  heroImagePath: '/images/placeholder-private-tour-hero.jpg',
  status: 'active',
  isPrivate: true,
  sortOrder: 2,
  highlights: [
    'The vehicle to yourselves all day',
    'Free Canadian maple syrup tasting',
    'Photo stop at the Floral Clock',
    'Niagara Parks Power Station',
    'Scenic drive along the Niagara Parkway',
  ],
  importantInfo: 'Attraction tickets aren’t included. We’ll help you buy them on the day.',
  packages: privateTourPackages,
  addons: [],
  pickups: [pickupTime(yorkStreet, '07:45')],
};

export const tours: Tour[] = [niagaraDayTour, niagaraPrivateTour];

// --- Departures ------------------------------------------------------------

/**
 * The next 30 days at 08:00 Toronto time, eleven seats per departure. Offline
 * builds get a believable calendar without a database. Private tours have no
 * departures: they are requested through the inquiry form.
 */
export function getFixtureDepartures(): Departure[] {
  const departures: Departure[] = [];
  const today = new Date();

  for (const tour of tours) {
    if (tour.isPrivate) continue;

    for (let day = 1; day <= FIXTURE_DEPARTURE_DAYS; day += 1) {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + day);
      const isoDate = date.toISOString().slice(0, 10);

      departures.push({
        id: `departure-${tour.id}-${isoDate}`,
        tourId: tour.id,
        startsAt: `${isoDate}T08:00:00-04:00`,
        capacity: FIXTURE_CAPACITY,
        status: 'open',
        seatsLeft: FIXTURE_CAPACITY,
      });
    }
  }

  return departures;
}

// --- Site settings ---------------------------------------------------------

export const siteSettings: SiteSettings = {
  name: 'Toronto Niagara Tours',
  tagline: 'Small-group Niagara Falls day tours from Toronto',
  phone: 'TODO: +1 (416) 555-0142',
  whatsapp: 'TODO: +1 (416) 555-0142',
  email: 'hello@torontoniagara.example',
  address: 'TODO: 65 Front Street West, Toronto, ON M5J 1E6, Canada',
  hstNumber: 'TODO: HST registration number',
  cancellationPolicy:
    'TODO: confirm the cancellation window with the owner. Placeholder: free cancellation up to 24 hours before departure.',
  announcement: { enabled: false, text: 'TODO: announcement text', href: null },
  ratings: [
    { platform: 'TODO: Google', score: 4.9, count: 0, url: 'https://example.com/todo-google-reviews' },
    { platform: 'TODO: Tripadvisor', score: 4.8, count: 0, url: 'https://example.com/todo-tripadvisor-reviews' },
  ],
  lastPublishAt: null,
};

// --- FAQs -----------------------------------------------------------------

export const faqs: Faq[] = [
  { id: 'weather', question: 'What happens if it rains?', answer: 'We run in the rain, snow and shine — the vehicle is heated and the falls are just as impressive in bad weather. The only exception is a severe weather warning from Environment Canada, in which case we reschedule you for free or refund you in full.\n\nBring a light rain jacket if the forecast looks wet.', tourId: null, sortOrder: 1, isActive: true },
  { id: 'boat-season', question: 'When does the boat cruise run?', answer: 'The boat cruise usually runs from early May to late November. Attraction tickets are not included in our price, so you add them on the day — and in the winter months Journey Behind the Falls is the better option. We’ll help you get your tickets either way.', tourId: null, sortOrder: 2, isActive: true },
  { id: 'passports', question: 'Do I need a passport?', answer: 'No. The whole tour stays on the Canadian side of the border, so a passport is not required — even for US citizens. Bring photo ID if you would like it for the boat, but it is not checked.', tourId: null, sortOrder: 3, isActive: true },
  { id: 'children', question: 'Is the tour suitable for children?', answer: 'Yes. Children are welcome. Child and senior prices are not set for this season, so everyone pays the same price.\n\nPrivate tours are a good choice for larger families: the whole vehicle is yours for the day.', tourId: null, sortOrder: 4, isActive: true },
  { id: 'accessibility', question: 'Do you accommodate wheelchairs and strollers?', answer: 'Our vans have space for one folding wheelchair or two strollers, but please tell us when you book so we can keep it free. The Table Rock centre and the boat are wheelchair accessible. Some viewpoints along the Niagara Parkway are gravel, so a companion is helpful.', tourId: null, sortOrder: 5, isActive: true },
  { id: 'cancellation', question: 'Can I cancel my booking?', answer: 'You can cancel free of charge up to 24 hours before your departure and we refund the full amount. Inside 24 hours the full price applies because we hold your seats and pickups.\n\nTo cancel, reply to your confirmation email with your booking reference.', tourId: null, sortOrder: 6, isActive: true },
  { id: 'what-to-bring', question: 'What should I bring?', answer: 'Comfortable shoes, a light rain jacket, sunscreen and a refillable water bottle. The boat cruise gets you close enough to the falls to feel the spray, so a dry layer is a good idea even on a sunny day.\n\nLeave large luggage at your hotel — there is limited space on the bus.', tourId: null, sortOrder: 7, isActive: true },
  { id: 'pickup', question: 'Where do you pick up?', answer: 'We pick up at 55 York St in downtown Toronto, a short walk from Union Station. Arrive five minutes early — the vehicle cannot wait past its slot.', tourId: null, sortOrder: 8, isActive: true },
];

// --- Reviews --------------------------------------------------------------

export const reviews: Review[] = [
  { id: 'sarah-m', author: 'Sarah M.', location: 'Chicago, USA', rating: 5, text: 'The whole day ran like clockwork. Our guide knew exactly when to beat the crowds at the falls and the boat ride was the highlight of our trip.', reviewDate: '2026-08-14', source: 'google', tourId: null, featured: true, isActive: true, sortOrder: 1 },
  { id: 'james-t', author: 'James T.', location: 'Toronto, Canada', rating: 5, text: 'Picked up at 55 York St and back in time for dinner. Small group, no queues and a guide who actually made the drive interesting.', reviewDate: '2026-07-22', source: 'tripadvisor', tourId: null, featured: true, isActive: true, sortOrder: 2 },
  { id: 'priya-k', author: 'Priya K.', location: 'Mississauga, Canada', rating: 4, text: 'Great value for a full day out. The free time in Niagara-on-the-Lake was a little short, but the cruise and the guide more than made up for it.', reviewDate: '2026-06-30', source: 'google', tourId: null, featured: true, isActive: true, sortOrder: 3 },
  { id: 'daniel-r', author: 'Daniel R.', location: 'Buffalo, USA', rating: 5, text: 'Booked the private tour for our anniversary and had the day to ourselves. Watching the falls from the Parkway with nobody rushing us was unforgettable.', reviewDate: '2026-09-05', source: 'direct', tourId: 'tour-private-niagara-falls', featured: false, isActive: true, sortOrder: 4 },
  { id: 'emma-l', author: 'Emma L.', location: 'London, UK', rating: 5, text: 'The maple syrup tasting was a lovely surprise and the driver-guide really knew the region. Easily the best day of our two weeks in Ontario.', reviewDate: '2026-05-18', source: 'tripadvisor', tourId: null, featured: true, isActive: true, sortOrder: 5 },
  { id: 'marc-g', author: 'Marc G.', location: 'Montreal, Canada', rating: 4, text: 'Comfortable bus and a friendly driver. The itinerary was well paced, though we would have liked more time at the whirlpool.', reviewDate: '2026-08-02', source: 'direct', tourId: null, featured: false, isActive: true, sortOrder: 6 },
  { id: 'olivia-p', author: 'Olivia P.', location: 'Hamilton, Canada', rating: 5, text: 'Took my parents for their first trip to the falls. Pickup was on time, everything was organised and the guide was patient with my dad’s questions.', reviewDate: '2026-07-11', source: 'google', tourId: null, featured: true, isActive: true, sortOrder: 7 },
  { id: 'noah-w', author: 'Noah W.', location: 'Ottawa, Canada', rating: 5, text: 'The day was relaxed and never felt rushed. The stops along the Niagara Parkway were well chosen, which made the price feel good value.', reviewDate: '2026-09-27', source: 'tripadvisor', tourId: null, featured: false, isActive: true, sortOrder: 8 },
];
