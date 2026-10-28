import type { Departure, Package, PickupLocation, Tour } from '../lib/types';

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
