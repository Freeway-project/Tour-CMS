import { slideshowPhotos } from './photos';
import { isPlaceholder } from './placeholder';
import type { Faq, PickupLocation, Review, Tour } from './types';

export interface NavLink {
  href: string;
  label: string;
}

/** Which home page sections render (each flag mirrors the section's own condition). */
export interface HomeSections {
  tours: boolean;
  experience: boolean;
  pickup: boolean;
  reviews: boolean;
  faq: boolean;
}

const LINKS: { key: keyof HomeSections; href: string; label: string }[] = [
  { key: 'tours', href: '/#tours', label: 'Tours' },
  { key: 'experience', href: '/#experience', label: 'Experience' },
  { key: 'pickup', href: '/#pickup', label: 'Pickup' },
  { key: 'reviews', href: '/#reviews', label: 'Reviews' },
  { key: 'faq', href: '/#faq', label: 'FAQ' },
];

/** Header links, only for sections that actually render. */
export function homeNav(sections: HomeSections): NavLink[] {
  return LINKS.filter((link) => sections[link.key]).map(({ href, label }) => ({ href, label }));
}

/**
 * Distinct real pickup points across the visible tours (active, not a
 * placeholder), in first-seen order. Used by the footer's "Pickup" block.
 */
export function pickupPoints(tours: Tour[]): PickupLocation[] {
  const seen = new Set<string>();
  const points: PickupLocation[] = [];
  for (const tour of tours) {
    if (tour.status === 'hidden') continue;
    for (const pickup of tour.pickups) {
      if (!pickup.isActive || isPlaceholder(pickup.name) || seen.has(pickup.id)) continue;
      seen.add(pickup.id);
      points.push(pickup);
    }
  }
  return points;
}

/** Fewest photos for the home "More than just the falls" grid. */
export const MIN_EXPERIENCE_PHOTOS = 3;

/**
 * Which home sections render, from the same data the home page uses. The home
 * page and the header on every page share this, so a link never points at a
 * missing section.
 */
export function homeSections(tours: Tour[], reviews: Review[], faqs: Faq[]): HomeSections {
  const visible = tours.filter((tour) => tour.status !== 'hidden');
  return {
    tours: visible.length > 0,
    experience: slideshowPhotos(visible.map((tour) => tour.images)).length >= MIN_EXPERIENCE_PHOTOS,
    pickup: pickupPoints(tours).length > 0,
    reviews: reviews.some((review) => !isPlaceholder(review.author) && !isPlaceholder(review.text)),
    faq: faqs.length > 0,
  };
}
