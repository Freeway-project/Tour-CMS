import { ctaButton } from './objects/cta-button';
import { faqItem } from './objects/faq-item';
import { imageWithAlt } from './objects/image-with-alt';
import { itineraryStop } from './objects/itinerary-stop';
import { priceTier } from './objects/price-tier';
import { seo } from './objects/seo';

import { guide } from './documents/guide';
import { landingPage } from './documents/landing-page';
import { pickupLocation } from './documents/pickup-location';
import { review } from './documents/review';
import { siteSettings } from './documents/site-settings';
import { tour } from './documents/tour';

export { getFromPrice } from './utils';
export type { PortableTextBlock } from '@portabletext/types';
export type * from './types';

export const schemaTypes = [
  // Documents
  tour,
  landingPage,
  review,
  pickupLocation,
  guide,
  siteSettings,
  // Objects
  seo,
  imageWithAlt,
  priceTier,
  itineraryStop,
  faqItem,
  ctaButton,
];
