import type {
  FaqItem,
  ImageWithAlt,
  LandingPage,
  PickupLocation,
  PortableTextBlock,
  Review,
  SiteSettings,
  Tour,
} from '@tour-cms/schema';
import { getFromPrice } from '@tour-cms/schema';

/**
 * Sample content used while the site is not connected to Sanity yet.
 * Every value is made up: names, prices, phone numbers and URLs are placeholders.
 */

// --- Portable text helpers -------------------------------------------------

function paragraph(text: string, key: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}-span`, text, marks: [] }],
  };
}

function heading(text: string, key: string): PortableTextBlock {
  return {
    _type: 'block',
    _key: key,
    style: 'h2',
    markDefs: [],
    children: [{ _type: 'span', _key: `${key}-span`, text, marks: [] }],
  };
}

function makeFaq(question: string, answer: string, key: string): FaqItem {
  return { question, answer: [paragraph(answer, key)] };
}

// --- Images ----------------------------------------------------------------

const heroFalls: ImageWithAlt = {
  src: '/images/placeholder-niagara-hero.jpg',
  alt: 'Mist rising from Horseshoe Falls with the tour boat below',
  width: 1600,
  height: 900,
};

const galleryFallsCloser: ImageWithAlt = {
  src: '/images/placeholder-niagara-closer.jpg',
  alt: 'Guests in blue ponchos on the Hornblower cruise near the falls',
  width: 1200,
  height: 800,
};

const galleryNiagaraOnTheLake: ImageWithAlt = {
  src: '/images/placeholder-niagara-on-the-lake.jpg',
  alt: 'Flower-lined main street in Niagara-on-the-Lake',
  width: 1200,
  height: 800,
};

const heroFireworks: ImageWithAlt = {
  src: '/images/placeholder-fireworks-hero.jpg',
  alt: 'Fireworks over Niagara Falls at night',
  width: 1600,
  height: 900,
};

const galleryFireworks: ImageWithAlt = {
  src: '/images/placeholder-fireworks-view.jpg',
  alt: 'Illuminated Niagara Falls seen from the Canadian side at night',
  width: 1200,
  height: 800,
};

const heroWineCountry: ImageWithAlt = {
  src: '/images/placeholder-wine-hero.jpg',
  alt: 'Rows of grapevines at a Niagara winery in late summer',
  width: 1600,
  height: 900,
};

const galleryWineTasting: ImageWithAlt = {
  src: '/images/placeholder-wine-tasting.jpg',
  alt: 'A flight of white wines on a tasting room table',
  width: 1200,
  height: 800,
};

const siteLogo: ImageWithAlt = {
  src: '/images/placeholder-logo.jpg',
  alt: 'Maple Leaf Tours logo',
  width: 240,
  height: 64,
};

const socialShareImage: ImageWithAlt = {
  src: '/images/placeholder-social-share.jpg',
  alt: 'Niagara Falls on a sunny day',
  width: 1200,
  height: 630,
};

const trustBadgeImage: ImageWithAlt = {
  src: '/images/placeholder-trust-badge.jpg',
  alt: 'Tripadvisor Travellers’ Choice award badge',
  width: 200,
  height: 200,
};

// --- Site settings ---------------------------------------------------------

export const siteSettings: SiteSettings = {
  _id: 'siteSettings',
  _type: 'siteSettings',
  siteName: 'Maple Leaf Tours',
  tagline: 'Small-group Niagara Falls tours from Toronto',
  phone: '+1 (416) 555-0142',
  whatsapp: '+1 (416) 555-0142',
  email: 'hello@mapleleaftours.example',
  address: '65 Front Street West, Toronto, ON M5J 1E6, Canada',
  logo: siteLogo,
  defaultSeo: {
    metaTitle: 'Niagara Falls Tours from Toronto | Maple Leaf Tours',
    metaDescription:
      'Small-group Niagara Falls day tours from Toronto with hotel pickup, a local guide and Hornblower cruise tickets. Book online in two minutes.',
    ogImage: socialShareImage,
    noIndex: false,
  },
  socialLinks: [
    { platform: 'instagram', url: 'https://www.instagram.com/example' },
    { platform: 'facebook', url: 'https://www.facebook.com/example' },
    { platform: 'tripadvisor', url: 'https://www.tripadvisor.com/example' },
    { platform: 'google', url: 'https://www.google.com/maps/place/example' },
  ],
  announcementBar: {
    enabled: true,
    text: 'Spring sale: save 15% on May departures',
    link: 'https://example.com/spring-sale',
  },
  trustBadges: [
    { label: 'Travellers’ Choice 2026', image: trustBadgeImage },
    { label: 'Licensed Ontario tour operator', image: trustBadgeImage },
  ],
};

// --- Reviews ---------------------------------------------------------------

const reviewSarahM: Review = {
  _id: 'review-sarah-m',
  _type: 'review',
  authorName: 'Sarah M.',
  authorLocation: 'Chicago, USA',
  rating: 5,
  text: 'The whole day ran like clockwork. Our guide knew exactly when to beat the crowds at the falls and the boat ride was the highlight of our trip.',
  date: '2026-08-14',
  source: 'google',
  featured: true,
};

const reviewJamesT: Review = {
  _id: 'review-james-t',
  _type: 'review',
  authorName: 'James T.',
  authorLocation: 'Toronto, Canada',
  rating: 5,
  text: 'Picked up right outside our hotel and back in time for dinner. Small group, no queues and a guide who actually made the drive interesting.',
  date: '2026-07-22',
  source: 'tripadvisor',
  featured: true,
};

const reviewPriyaK: Review = {
  _id: 'review-priya-k',
  _type: 'review',
  authorName: 'Priya K.',
  authorLocation: 'Mississauga, Canada',
  rating: 4,
  text: 'Great value for a full day out. The free time in Niagara-on-the-Lake was a little short, but the cruise and the guide more than made up for it.',
  date: '2026-06-30',
  source: 'google',
  featured: true,
};

const reviewDanielR: Review = {
  _id: 'review-daniel-r',
  _type: 'review',
  authorName: 'Daniel R.',
  authorLocation: 'Buffalo, USA',
  rating: 5,
  text: 'Booked the evening tour for our anniversary. Watching the fireworks over the falls with a glass of wine was unforgettable.',
  date: '2026-09-05',
  source: 'facebook',
  featured: false,
};

const reviewEmmaL: Review = {
  _id: 'review-emma-l',
  _type: 'review',
  authorName: 'Emma L.',
  authorLocation: 'London, UK',
  rating: 5,
  text: 'Three wineries, a lovely lunch and a guide who really knew the region. Easily the best day of our two weeks in Ontario.',
  date: '2026-05-18',
  source: 'tripadvisor',
  featured: true,
};

const reviewMarcG: Review = {
  _id: 'review-marc-g',
  _type: 'review',
  authorName: 'Marc G.',
  authorLocation: 'Montreal, Canada',
  rating: 4,
  text: 'Comfortable bus and a friendly driver. The itinerary was well paced, though we would have liked more time at the whirlpool.',
  date: '2026-08-02',
  source: 'direct',
  featured: false,
};

const reviewOliviaP: Review = {
  _id: 'review-olivia-p',
  _type: 'review',
  authorName: 'Olivia P.',
  authorLocation: 'Hamilton, Canada',
  rating: 5,
  text: 'Took my parents for their first trip to the falls. Pickup was on time, everything was organised and the guide was patient with my dad’s questions.',
  date: '2026-07-11',
  source: 'google',
  featured: true,
};

const reviewNoahW: Review = {
  _id: 'review-noah-w',
  _type: 'review',
  authorName: 'Noah W.',
  authorLocation: 'Ottawa, Canada',
  rating: 5,
  text: 'The wine tour was relaxed and never felt rushed. The tasting fees were already covered, which made the day feel good value.',
  date: '2026-09-27',
  source: 'tripadvisor',
  featured: false,
};

export const reviews: Review[] = [
  reviewSarahM,
  reviewJamesT,
  reviewPriyaK,
  reviewDanielR,
  reviewEmmaL,
  reviewMarcG,
  reviewOliviaP,
  reviewNoahW,
];

// --- Pickup locations ------------------------------------------------------

const unionStation: PickupLocation = {
  _id: 'pickup-union-station',
  _type: 'pickupLocation',
  name: 'Union Station – Front St entrance',
  address: '65 Front Street West, Toronto, ON M5J 1E6',
  geo: { lat: 43.6453, lng: -79.3806 },
  pickupTime: '7:15 AM',
  notes: 'Wait by the taxi stand on Front Street, under the station clock.',
};

const chelseaHotel: PickupLocation = {
  _id: 'pickup-chelsea-hotel',
  _type: 'pickupLocation',
  name: 'Chelsea Hotel, Toronto',
  address: '33 Gerrard Street West, Toronto, ON M5G 1Z4',
  geo: { lat: 43.6602, lng: -79.3835 },
  pickupTime: '7:25 AM',
  notes: 'Meet the bus at the main entrance on Gerrard Street.',
};

const fairmontRoyalYork: PickupLocation = {
  _id: 'pickup-royal-york',
  _type: 'pickupLocation',
  name: 'Fairmont Royal York',
  address: '100 Front Street West, Toronto, ON M5J 1E3',
  geo: { lat: 43.6457, lng: -79.3815 },
  pickupTime: '7:30 AM',
  notes: 'Use the Front Street entrance, opposite Union Station.',
};

const northYorkCentre: PickupLocation = {
  _id: 'pickup-north-york-centre',
  _type: 'pickupLocation',
  name: 'North York Centre – Yonge St',
  address: '5150 Yonge Street, Toronto, ON M2N 6L8',
  geo: { lat: 43.7695, lng: -79.4131 },
  pickupTime: '8:00 AM',
  notes: 'Meet outside the library entrance, north of Mel Lastman Square.',
};

export const pickupLocations: PickupLocation[] = [
  unionStation,
  chelseaHotel,
  fairmontRoyalYork,
  northYorkCentre,
];

// --- Tours -----------------------------------------------------------------

const niagaraDayPriceTiers = [
  { label: 'Adult', priceCad: 149 },
  { label: 'Child 3–12', priceCad: 119, note: 'Children under 3 travel free' },
];

const niagaraDayTour: Tour = {
  _id: 'tour-niagara-falls-day',
  _type: 'tour',
  title: 'Niagara Falls Day Tour from Toronto',
  slug: 'niagara-falls-day-tour',
  status: 'active',
  shortDescription:
    'A full day at Niagara Falls with a Hornblower cruise, a local guide and round-trip pickup from downtown Toronto.',
  body: [
    heading('A full day at the Falls, without the planning', 'niagara-day-body-heading'),
    paragraph(
      'We pick you up in downtown Toronto in the morning and drive straight to the Canadian side of Niagara Falls. Your guide handles the tickets, the timing and the best viewpoints, so you can enjoy the day instead of queueing.',
      'niagara-day-body-1',
    ),
    paragraph(
      'The Hornblower cruise takes you to the base of Horseshoe Falls — expect to get wet. After lunch there is free time at Table Rock, a scenic drive along the Niagara Parkway and a short stop in Niagara-on-the-Lake before we head back to the city.',
      'niagara-day-body-2',
    ),
  ],
  heroImage: heroFalls,
  gallery: [galleryFallsCloser, galleryNiagaraOnTheLake],
  durationHours: 10,
  startTime: '7:30 AM',
  groupSizeMax: 24,
  priceTiers: niagaraDayPriceTiers,
  fromPriceCad: getFromPrice({ priceTiers: niagaraDayPriceTiers }),
  highlights: [
    'Hornblower boat cruise to the base of the falls',
    'Round-trip transport from downtown Toronto',
    'Free time in Niagara-on-the-Lake',
    'Small groups of 24 or fewer',
    'Local guide on board all day',
  ],
  included: [
    'Hotel pickup and drop-off in downtown Toronto',
    'Hornblower cruise ticket',
    'Local guide',
    'Bottled water on board',
  ],
  notIncluded: ['Gratuities', 'Lunch', 'Travel insurance'],
  itinerary: [
    {
      time: '7:30 AM',
      title: 'Pickup in downtown Toronto',
      description: 'Board the bus at one of our downtown pickup points.',
      durationMinutes: 30,
    },
    {
      time: '9:30 AM',
      title: 'Niagara-on-the-Lake',
      description: 'A short stop for photos on the flower-lined main street.',
      durationMinutes: 45,
    },
    {
      time: '11:00 AM',
      title: 'Hornblower cruise',
      description: 'A 20-minute boat ride to the base of Horseshoe Falls.',
      durationMinutes: 60,
    },
    {
      time: '12:15 PM',
      title: 'Free time at Table Rock',
      description: 'Lunch on your own and time at the closest viewpoint to the falls.',
      durationMinutes: 90,
    },
    {
      time: '2:00 PM',
      title: 'Niagara Parkway drive',
      description: 'Stops at the Floral Clock and the Whirlpool Rapids viewpoint.',
      durationMinutes: 45,
    },
    {
      time: '4:00 PM',
      title: 'Return to Toronto',
      description: 'Drop-off at the same downtown locations in the late afternoon.',
      durationMinutes: 90,
    },
  ],
  pickupLocations: [unionStation, chelseaHotel, fairmontRoyalYork, northYorkCentre],
  faqs: [
    makeFaq(
      'Do you pick up from my hotel?',
      'We pick up from Union Station, the Chelsea Hotel, the Fairmont Royal York and North York Centre. Choose the closest point when you book — most downtown hotels are within a short walk.',
      'niagara-day-faq-pickup',
    ),
    makeFaq(
      'Will I get wet on the boat?',
      'Yes, a little. The Hornblower cruise goes close to the falls and spray is part of the fun. Ponchos are handed out before boarding, but bring a dry layer if you plan to take photos.',
      'niagara-day-faq-boat',
    ),
    makeFaq(
      'Is lunch included?',
      'Lunch is not included. You will have 90 minutes of free time at Table Rock, where there are several cafés and restaurants to choose from.',
      'niagara-day-faq-lunch',
    ),
  ],
  reviews: [reviewSarahM, reviewJamesT, reviewPriyaK, reviewDanielR],
  booking: {
    provider: 'fareharbor',
    productId: 'niagara-day-2026',
    bookingUrl: 'https://fareharbor.example.com/niagara-day',
  },
  seasonalNote:
    'The Hornblower cruise runs May–October. Outside those months we visit Journey Behind the Falls instead.',
  seo: {
    metaTitle: 'Niagara Falls Day Tour from Toronto | Maple Leaf Tours',
    metaDescription:
      'Full-day Niagara Falls tour from Toronto with Hornblower cruise, local guide and downtown pickup. Small groups, from $149 CAD. Book online.',
    ogImage: heroFalls,
    noIndex: false,
  },
};

const niagaraFireworksPriceTiers = [
  { label: 'Adult', priceCad: 159 },
  { label: 'Child 3–12', priceCad: 129, note: 'Children under 3 travel free' },
];

const niagaraFireworksTour: Tour = {
  _id: 'tour-niagara-falls-fireworks',
  _type: 'tour',
  title: 'Niagara Falls Evening Tour with Fireworks',
  slug: 'niagara-falls-evening-fireworks',
  status: 'seasonal',
  shortDescription:
    'See the falls light up after dark, then watch the summer fireworks from the best spot on the Canadian side.',
  body: [
    heading('The falls after dark', 'fireworks-body-heading'),
    paragraph(
      'This evening trip leaves Toronto in the late afternoon and arrives at Niagara Falls just as the lights come on. Your guide takes you to the best viewpoints for the illuminated falls, then settles in for the fireworks display over the gorge.',
      'fireworks-body-1',
    ),
    paragraph(
      'There is time for dinner on your own near Table Rock before the show. The tour runs on fireworks nights from May to October and returns to Toronto around 11:00 PM.',
      'fireworks-body-2',
    ),
  ],
  heroImage: heroFireworks,
  gallery: [galleryFireworks, galleryFallsCloser],
  durationHours: 7,
  startTime: '4:00 PM',
  groupSizeMax: 20,
  priceTiers: niagaraFireworksPriceTiers,
  fromPriceCad: getFromPrice({ priceTiers: niagaraFireworksPriceTiers }),
  highlights: [
    'Summer fireworks over the falls',
    'Illumination display after sunset',
    'Dinner stop near Table Rock',
    'Small groups of 20 or fewer',
  ],
  included: ['Round-trip transport from downtown Toronto', 'Local guide', 'Fireworks viewing spot'],
  notIncluded: ['Dinner', 'Gratuities', 'Travel insurance'],
  itinerary: [
    {
      time: '4:00 PM',
      title: 'Pickup in downtown Toronto',
      description: 'Board the bus at Union Station or the Fairmont Royal York.',
      durationMinutes: 30,
    },
    {
      time: '6:00 PM',
      title: 'Dinner stop at Table Rock',
      description: 'Choose from the restaurants beside the falls at your own pace.',
      durationMinutes: 75,
    },
    {
      time: '8:00 PM',
      title: 'Illuminated falls',
      description: 'The falls are lit in colour every evening after sunset.',
      durationMinutes: 45,
    },
    {
      time: '9:00 PM',
      title: 'Fireworks display',
      description: 'Watch the fireworks from our reserved viewing area.',
      durationMinutes: 30,
    },
    {
      time: '9:30 PM',
      title: 'Return to Toronto',
      description: 'Drop-off at the downtown pickup points around 11:00 PM.',
      durationMinutes: 90,
    },
  ],
  pickupLocations: [unionStation, chelseaHotel, fairmontRoyalYork],
  faqs: [
    makeFaq(
      'When do the fireworks run?',
      'Fireworks usually run on selected evenings from May to October. The exact nights are set by Niagara Parks each spring, so check the calendar when you book.',
      'fireworks-faq-dates',
    ),
    makeFaq(
      'What time do we get back?',
      'We leave Niagara Falls after the fireworks and drop everyone off in downtown Toronto around 11:00 PM, depending on traffic.',
      'fireworks-faq-return',
    ),
  ],
  reviews: [reviewDanielR, reviewJamesT, reviewMarcG],
  booking: {
    provider: 'peek',
    productId: 'nf-fireworks-evening',
    bookingUrl: 'https://peek.example.com/nf-fireworks-evening',
  },
  seasonalNote: 'Fireworks departures run May–October. No evening tours in winter.',
  seo: {
    metaTitle: 'Niagara Falls Evening Tour with Fireworks | Maple Leaf Tours',
    metaDescription:
      'Evening tour from Toronto to see Niagara Falls lit up and the summer fireworks. Downtown pickup and a local guide. From $159 CAD.',
    ogImage: heroFireworks,
    noIndex: false,
  },
};

const wineCountryPriceTiers = [
  { label: 'Adult (19+)', priceCad: 189, note: 'Includes all three tastings' },
];

const wineCountryTour: Tour = {
  _id: 'tour-niagara-wine-country',
  _type: 'tour',
  title: 'Niagara-on-the-Lake Wine Country Tour',
  slug: 'niagara-wine-country-tour',
  status: 'active',
  shortDescription:
    'Taste your way through Niagara-on-the-Lake with three winery visits, a vineyard lunch and a guided walk through town.',
  body: [
    heading('Three wineries, one relaxed day', 'wine-body-heading'),
    paragraph(
      'The Niagara Peninsula is one of Canada’s best wine regions, and this small-group tour introduces you to three very different wineries. Tastings are included at each stop, from crisp Rieslings to the region’s famous icewine.',
      'wine-body-1',
    ),
    paragraph(
      'Between tastings there is time for lunch overlooking the vines and a guided walk through the shops and gardens of Niagara-on-the-Lake. This tour is for adults 19 and over.',
      'wine-body-2',
    ),
  ],
  heroImage: heroWineCountry,
  gallery: [galleryWineTasting, galleryNiagaraOnTheLake],
  durationHours: 8,
  startTime: '9:00 AM',
  groupSizeMax: 16,
  priceTiers: wineCountryPriceTiers,
  fromPriceCad: getFromPrice({ priceTiers: wineCountryPriceTiers }),
  highlights: [
    'Tastings at three Niagara wineries',
    'Vineyard lunch overlooking the rows',
    'Guided walk through Niagara-on-the-Lake',
    'Adults only, groups of 16 or fewer',
  ],
  included: [
    'Round-trip transport from Toronto',
    'Three wine tastings',
    'Lunch at a vineyard restaurant',
    'Local wine guide',
  ],
  notIncluded: ['Extra bottles to take home', 'Gratuities', 'Travel insurance'],
  itinerary: [
    {
      time: '9:00 AM',
      title: 'Pickup in downtown Toronto',
      description: 'Meet at Union Station or the Fairmont Royal York.',
      durationMinutes: 30,
    },
    {
      time: '10:45 AM',
      title: 'First winery',
      description: 'A guided tasting of estate Riesling and Chardonnay.',
      durationMinutes: 60,
    },
    {
      time: '12:00 PM',
      title: 'Vineyard lunch',
      description: 'A seasonal lunch at a winery restaurant, with a glass of wine included.',
      durationMinutes: 75,
    },
    {
      time: '2:00 PM',
      title: 'Second and third wineries',
      description: 'Two more tastings, including a red blend and an icewine.',
      durationMinutes: 120,
    },
    {
      time: '4:30 PM',
      title: 'Return to Toronto',
      description: 'Drop-off at the downtown pickup points around 6:30 PM.',
      durationMinutes: 120,
    },
  ],
  pickupLocations: [unionStation, fairmontRoyalYork, northYorkCentre],
  faqs: [
    makeFaq(
      'Can I bring children?',
      'This tour is for adults 19 and over only, because every stop includes wine tasting. Our Niagara Falls day tour is a better fit for families.',
      'wine-faq-age',
    ),
    makeFaq(
      'Are the tastings included in the price?',
      'Yes. All three tastings and lunch are included in the ticket price. You only pay extra for bottles or souvenirs you take home.',
      'wine-faq-included',
    ),
  ],
  reviews: [reviewEmmaL, reviewNoahW, reviewOliviaP],
  booking: {
    provider: 'bokun',
    productId: 'notl-wine-country',
    bookingUrl: 'https://bokun.example.com/notl-wine-country',
  },
  seasonalNote: 'Winery visits run year-round; the vineyard walk is weather dependent.',
  seo: {
    metaTitle: 'Niagara-on-the-Lake Wine Country Tour | Maple Leaf Tours',
    metaDescription:
      'Adults-only wine tour from Toronto to three Niagara-on-the-Lake wineries, with tastings and vineyard lunch included. From $189 CAD.',
    ogImage: heroWineCountry,
    noIndex: false,
  },
};

export const tours: Tour[] = [niagaraDayTour, niagaraFireworksTour, wineCountryTour];

// --- Landing pages ---------------------------------------------------------

const landingPageFaqs: FaqItem[] = [
  makeFaq(
    'How long is the tour?',
    'The day tour lasts about 10 hours, including travel time from downtown Toronto and roughly four hours at Niagara Falls.',
    'lp-day-faq-duration',
  ),
  makeFaq(
    'What is included in the price?',
    'Round-trip transport, your guide and the Hornblower cruise ticket are included. Lunch and gratuities are not.',
    'lp-day-faq-included',
  ),
  makeFaq(
    'Can I cancel?',
    'You can cancel free of charge up to 24 hours before departure. Inside 24 hours the full price applies.',
    'lp-day-faq-cancel',
  ),
];

const niagaraDayLandingPage: LandingPage = {
  _id: 'landing-page-niagara-day-search',
  _type: 'landingPage',
  title: 'Niagara day tour — Google search',
  slug: 'niagara-falls-day-tour',
  tour: niagaraDayTour,
  variant: 'A',
  utmCampaign: 'niagara-day-tour-search',
  headline: 'Niagara Falls in one easy day from Toronto',
  subheadline:
    'Hotel pickup, a local guide and your Hornblower cruise ticket included. Back in the city for dinner.',
  sections: [
    {
      _type: 'heroSection',
      _key: 'hero',
      image: heroFalls,
      showRating: true,
      cta: { label: 'Book now — from $149', kind: 'book' },
    },
    {
      _type: 'benefitsSection',
      _key: 'benefits',
      heading: 'Why book this tour',
      items: [
        {
          icon: 'bus',
          title: 'Pickup near your hotel',
          text: 'Four downtown pickup points, all a short walk from the main hotels.',
        },
        {
          icon: 'ticket',
          title: 'Cruise ticket included',
          text: 'No separate booking and no queueing at the Hornblower ticket desk.',
        },
        {
          icon: 'users',
          title: 'Small groups',
          text: 'A maximum of 24 guests, with a local guide on board all day.',
        },
        {
          icon: 'clock',
          title: 'Back for dinner',
          text: 'Leave at 7:30 AM and return to Toronto in the late afternoon.',
        },
      ],
    },
    {
      _type: 'itinerarySection',
      _key: 'itinerary',
      heading: 'Your day, step by step',
    },
    {
      _type: 'reviewsSection',
      _key: 'reviews',
      heading: 'What guests say',
      reviews: [reviewSarahM, reviewJamesT, reviewEmmaL],
    },
    {
      _type: 'faqSection',
      _key: 'faq',
      heading: 'Questions before you book',
      items: landingPageFaqs,
    },
    {
      _type: 'ctaSection',
      _key: 'cta',
      heading: 'Ready to see the Falls?',
      text: 'Pick a date and we will take care of the rest.',
      cta: { label: 'Check availability', kind: 'book' },
    },
  ],
  seo: {
    metaTitle: 'Niagara Falls Day Tour from Toronto | Maple Leaf Tours',
    metaDescription:
      'Niagara Falls day tour from Toronto with cruise ticket and downtown pickup. Small groups from $149 CAD. Book online today.',
    noIndex: true,
  },
};

const fireworksLandingPage: LandingPage = {
  _id: 'landing-page-fireworks-meta',
  _type: 'landingPage',
  title: 'Fireworks evening tour — Meta',
  slug: 'niagara-falls-fireworks',
  tour: niagaraFireworksTour,
  variant: 'B',
  utmCampaign: 'niagara-fireworks-meta',
  headline: 'Watch the fireworks light up Niagara Falls',
  subheadline: 'An evening escape from Toronto, running on fireworks nights from May to October.',
  sections: [
    {
      _type: 'heroSection',
      _key: 'hero',
      image: heroFireworks,
      showRating: false,
      cta: { label: 'See available dates', kind: 'book' },
    },
    {
      _type: 'benefitsSection',
      _key: 'benefits',
      heading: 'Why go in the evening',
      items: [
        {
          icon: 'star',
          title: 'The falls after dark',
          text: 'Coloured lights turn the water into the best photo of your trip.',
        },
        {
          icon: 'clock',
          title: 'No full day needed',
          text: 'Leave at 4:00 PM and be back in Toronto around 11:00 PM.',
        },
        {
          icon: 'users',
          title: 'Small groups',
          text: 'A maximum of 20 guests and a guide with you all evening.',
        },
      ],
    },
    {
      _type: 'itinerarySection',
      _key: 'itinerary',
      heading: 'How the evening runs',
    },
    {
      _type: 'ctaSection',
      _key: 'cta',
      heading: 'Fireworks nights sell out',
      text: 'Check the calendar and reserve your seats before they go.',
      cta: { label: 'Check dates', kind: 'book' },
    },
  ],
  seo: {
    metaTitle: 'Niagara Falls Fireworks Evening Tour | Maple Leaf Tours',
    metaDescription:
      'Evening tour from Toronto to see Niagara Falls lit up and the summer fireworks. Downtown pickup and local guide. From $159 CAD.',
    noIndex: true,
  },
};

export const landingPages: LandingPage[] = [niagaraDayLandingPage, fireworksLandingPage];
