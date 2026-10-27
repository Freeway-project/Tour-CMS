import type { Addon, Departure, Package, PickupLocation, Tour } from '../lib/types';

/**
 * Fixture catalogue used whenever Supabase is not configured (no `.env`).
 *
 * Everything here is placeholder content: names, prices, phone numbers and
 * image paths are made up. The admin UI edits the real rows in Supabase.
 */

const FIXTURE_DEPARTURE_DAYS = 30;
const FIXTURE_CAPACITY = 7;

function pickupTime(location: PickupLocation, time: string): PickupLocation {
  return { ...location, pickupTime: time };
}

// --- Pickup locations ------------------------------------------------------

const unionStation: PickupLocation = {
  id: 'pickup-union-station',
  name: 'Union Station – Front St entrance',
  address: '65 Front Street West, Toronto, ON M5J 1E6',
  lat: 43.6453,
  lng: -79.3806,
  pickupNote: 'Wait by the taxi stand on Front Street, under the station clock.',
  isActive: true,
  pickupTime: null,
};

const chelseaHotel: PickupLocation = {
  id: 'pickup-chelsea-hotel',
  name: 'Chelsea Hotel, Toronto',
  address: '33 Gerrard Street West, Toronto, ON M5G 1Z4',
  lat: 43.6602,
  lng: -79.3835,
  pickupNote: 'Meet the bus at the main entrance on Gerrard Street.',
  isActive: true,
  pickupTime: null,
};

const fairmontRoyalYork: PickupLocation = {
  id: 'pickup-royal-york',
  name: 'Fairmont Royal York',
  address: '100 Front Street West, Toronto, ON M5J 1E3',
  lat: 43.6457,
  lng: -79.3815,
  pickupNote: 'Use the Front Street entrance, opposite Union Station.',
  isActive: true,
  pickupTime: null,
};

const northYorkCentre: PickupLocation = {
  id: 'pickup-north-york-centre',
  name: 'North York Centre – Yonge St',
  address: '5150 Yonge Street, Toronto, ON M2N 6L8',
  lat: 43.7695,
  lng: -79.4131,
  pickupNote: 'Meet outside the library entrance, north of Mel Lastman Square.',
  isActive: true,
  pickupTime: null,
};

export const pickupLocations: PickupLocation[] = [
  unionStation,
  chelseaHotel,
  fairmontRoyalYork,
  northYorkCentre,
];

// --- Niagara Falls day tour ------------------------------------------------

const dayTourId = 'tour-niagara-falls-day';

const dayTourPackages: Package[] = [
  {
    id: 'package-day-bus-only',
    tourId: dayTourId,
    name: 'Bus only',
    description: 'Round-trip transport from Toronto with free time at the falls.',
    includes: ['Round-trip transport', 'Local guide', 'Free time at Table Rock'],
    priceAdultCents: 9900,
    priceChildCents: 7920,
    priceSeniorCents: null,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'package-day-boat',
    tourId: dayTourId,
    name: '+ Boat cruise',
    description: 'The bus tour plus a Hornblower cruise to the base of Horseshoe Falls.',
    includes: ['Round-trip transport', 'Local guide', 'Hornblower cruise ticket'],
    priceAdultCents: 15900,
    priceChildCents: 12720,
    priceSeniorCents: null,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'package-day-boat-journey',
    tourId: dayTourId,
    name: '+ Boat & Journey Behind the Falls',
    description: 'Both boat and tunnel experiences, with a poncho for each.',
    includes: [
      'Round-trip transport',
      'Local guide',
      'Hornblower cruise ticket',
      'Journey Behind the Falls ticket',
    ],
    priceAdultCents: 20900,
    priceChildCents: 16720,
    priceSeniorCents: null,
    isActive: true,
    sortOrder: 3,
  },
];

const dayTourAddons: Addon[] = [
  {
    id: 'addon-lunch',
    tourId: dayTourId,
    name: 'Lunch at Table Rock',
    description: 'A set lunch at the Table Rock market, paid when you book.',
    priceCents: 2500,
    pricing: 'per_person',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'addon-airport-dropoff',
    tourId: dayTourId,
    name: 'Airport drop-off',
    description: 'Drop-off at Toronto Pearson at the end of the day, per booking.',
    priceCents: 6000,
    pricing: 'per_booking',
    isActive: true,
    sortOrder: 2,
  },
];

const niagaraDayTour: Tour = {
  id: dayTourId,
  slug: 'niagara-falls-day-tour',
  title: 'Niagara Falls Day Tour from Toronto',
  shortDescription:
    'A full day at Niagara Falls with a Hornblower cruise, a local guide and round-trip pickup from downtown Toronto.',
  description:
    'We pick you up in downtown Toronto in the morning and drive straight to the Canadian side of Niagara Falls. Your guide handles the tickets, the timing and the best viewpoints, so you can enjoy the day instead of queueing.\n\nThe Hornblower cruise takes you to the base of Horseshoe Falls — expect to get wet. After lunch there is free time at Table Rock, a scenic drive along the Niagara Parkway and a short stop in Niagara-on-the-Lake before we head back to the city.',
  durationMinutes: 600,
  heroImagePath: '/images/placeholder-niagara-hero.jpg',
  status: 'active',
  isPrivate: false,
  sortOrder: 1,
  packages: dayTourPackages,
  addons: dayTourAddons,
  pickups: [
    pickupTime(unionStation, '07:15'),
    pickupTime(chelseaHotel, '07:25'),
    pickupTime(fairmontRoyalYork, '07:30'),
    pickupTime(northYorkCentre, '08:00'),
  ],
};

// --- Niagara Falls evening fireworks tour ----------------------------------

const fireworksTourId = 'tour-niagara-falls-fireworks';

const niagaraFireworksTour: Tour = {
  id: fireworksTourId,
  slug: 'niagara-falls-evening-fireworks',
  title: 'Niagara Falls Evening Tour with Fireworks',
  shortDescription:
    'See the falls light up after dark, then watch the summer fireworks from the best spot on the Canadian side.',
  description:
    'This evening trip leaves Toronto in the late afternoon and arrives at Niagara Falls just as the lights come on. Your guide takes you to the best viewpoints for the illuminated falls, then settles in for the fireworks display over the gorge.\n\nThere is time for dinner on your own near Table Rock before the show. The tour runs on fireworks nights from May to October and returns to Toronto around 11:00 PM.',
  durationMinutes: 420,
  heroImagePath: '/images/placeholder-fireworks-hero.jpg',
  status: 'seasonal',
  isPrivate: false,
  sortOrder: 2,
  packages: [
    {
      id: 'package-fireworks-evening',
      tourId: fireworksTourId,
      name: 'Evening tour',
      description: 'Evening transport, guide and a reserved fireworks viewing spot.',
      includes: ['Round-trip transport', 'Local guide', 'Fireworks viewing spot'],
      priceAdultCents: 15900,
      priceChildCents: 12900,
      priceSeniorCents: null,
      isActive: true,
      sortOrder: 1,
    },
  ],
  addons: [],
  pickups: [
    pickupTime(unionStation, '16:00'),
    pickupTime(chelseaHotel, '16:15'),
    pickupTime(fairmontRoyalYork, '16:10'),
  ],
};

// --- Niagara-on-the-Lake wine tour -----------------------------------------

const wineTourId = 'tour-niagara-wine-country';

const wineCountryTour: Tour = {
  id: wineTourId,
  slug: 'niagara-wine-country-tour',
  title: 'Niagara-on-the-Lake Wine Country Tour',
  shortDescription:
    'Taste your way through Niagara-on-the-Lake with three winery visits, a vineyard lunch and a guided walk through town.',
  description:
    'The Niagara Peninsula is one of Canada’s best wine regions, and this small-group tour introduces you to three very different wineries. Tastings are included at each stop, from crisp Rieslings to the region’s famous icewine.\n\nBetween tastings there is time for lunch overlooking the vines and a guided walk through the shops and gardens of Niagara-on-the-Lake. This tour is for adults 19 and over.',
  durationMinutes: 480,
  heroImagePath: '/images/placeholder-wine-hero.jpg',
  status: 'active',
  isPrivate: false,
  sortOrder: 3,
  packages: [
    {
      id: 'package-wine-country',
      tourId: wineTourId,
      name: 'Wine country tour',
      description: 'Three tastings, a vineyard lunch and a guided walk in town.',
      includes: ['Round-trip transport', 'Three wine tastings', 'Vineyard lunch'],
      priceAdultCents: 18900,
      priceChildCents: null,
      priceSeniorCents: null,
      isActive: true,
      sortOrder: 1,
    },
  ],
  addons: [],
  pickups: [
    pickupTime(unionStation, '09:00'),
    pickupTime(chelseaHotel, '09:10'),
    pickupTime(fairmontRoyalYork, '09:05'),
  ],
};

export const tours: Tour[] = [niagaraDayTour, niagaraFireworksTour, wineCountryTour];

// --- Departures ------------------------------------------------------------

/**
 * The next 30 days at 08:00 Toronto time, seven seats per departure. Offline
 * builds get a believable calendar without a database.
 */
export function getFixtureDepartures(): Departure[] {
  const departures: Departure[] = [];
  const today = new Date();

  for (const tour of tours) {
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
