/**
 * Content access layer.
 *
 * These functions currently return typed fixtures from `src/data/fixtures.ts`.
 * A later task will swap the bodies for Sanity GROQ queries, keeping the same
 * signatures so pages do not need to change.
 */
import type { LandingPage, Review, SiteSettings, Tour } from '@tour-cms/schema';

import { landingPages, reviews, siteSettings, tours } from '../data/fixtures';

export async function getSiteSettings(): Promise<SiteSettings> {
  return siteSettings;
}

export async function getTours(): Promise<Tour[]> {
  return tours;
}

export async function getTourBySlug(slug: string): Promise<Tour | undefined> {
  return tours.find((tour) => tour.slug === slug);
}

export async function getLandingPageBySlug(slug: string): Promise<LandingPage | undefined> {
  return landingPages.find((page) => page.slug === slug);
}

export async function getFeaturedReviews(limit: number): Promise<Review[]> {
  return reviews.filter((review) => review.featured).slice(0, limit);
}
