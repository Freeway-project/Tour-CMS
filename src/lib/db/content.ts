import { faqs as fixtureFaqs, reviews as fixtureReviews, siteSettings as fixtureSiteSettings } from '../../data/fixtures';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Faq, Review, SiteSettings } from '../types';
import { supabase } from './client';

interface SiteSettingsRow {
  name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hst_number: string | null;
  cancellation_policy: string;
  privacy_policy: string;
  terms: string;
  announcement_enabled: boolean;
  announcement_text: string;
  announcement_href: string | null;
  ratings: Array<{ platform: string; score: number; count: number; url: string }> | null;
  last_publish_at: string | null;
}

interface FaqRow {
  id: string;
  question: string;
  answer: string;
  tour_id: string | null;
  sort_order: number;
  is_active: boolean;
}

interface ReviewRow {
  id: string;
  author: string;
  location: string | null;
  rating: number;
  text: string;
  review_date: string;
  source: string;
  tour_id: string | null;
  featured: boolean;
  is_active: boolean;
  sort_order: number;
}

function toReviewSource(value: string): Review['source'] {
  return value === 'tripadvisor' || value === 'viator' || value === 'direct' ? value : 'google';
}

export async function getSiteSettings(
  client: SupabaseClient | null = supabase,
): Promise<SiteSettings> {
  if (!client) return fixtureSiteSettings;

  const { data, error } = await client
    .from('site_settings')
    .select(
      'name, tagline, phone, whatsapp, email, address, hst_number, cancellation_policy, privacy_policy, terms, announcement_enabled, announcement_text, announcement_href, ratings, last_publish_at',
    )
    .eq('id', 1)
    .maybeSingle();

  if (error) throw new Error(`Failed to load site settings: ${error.message}`);
  if (!data) return fixtureSiteSettings;

  const row = data as unknown as SiteSettingsRow;
  return {
    name: row.name,
    tagline: row.tagline,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,
    hstNumber: row.hst_number,
    cancellationPolicy: row.cancellation_policy,
    privacyPolicy: row.privacy_policy,
    terms: row.terms,
    announcement: {
      enabled: row.announcement_enabled,
      text: row.announcement_text,
      href: row.announcement_href,
    },
    ratings: row.ratings ?? [],
    lastPublishAt: row.last_publish_at,
  };
}

export async function getFaqs(tourId?: string | null): Promise<Faq[]> {
  if (!supabase) {
    return fixtureFaqs
      .filter((faq) => {
        if (!faq.isActive) return false;
        if (tourId === undefined) return true;
        if (tourId === null) return faq.tourId === null;
        return faq.tourId === null || faq.tourId === tourId;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  let query = supabase
    .from('faqs')
    .select('id, question, answer, tour_id, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (tourId === undefined) {
    // all active FAQs
  } else if (tourId === null) {
    query = query.is('tour_id', null);
  } else {
    query = query.or(`tour_id.is.null,tour_id.eq.${tourId}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load FAQs: ${error.message}`);

  return ((data as unknown as FaqRow[]) ?? []).map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    tourId: row.tour_id,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  }));
}

export async function getReviews(options?: {
  tourId?: string | null;
  featuredOnly?: boolean;
}): Promise<Review[]> {
  if (!supabase) {
    return fixtureReviews
      .filter((review) => {
        if (!review.isActive) return false;
        if (options?.featuredOnly && !review.featured) return false;
        if (options?.tourId && review.tourId !== null && review.tourId !== options.tourId) return false;
        return true;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  let query = supabase
    .from('reviews')
    .select('id, author, location, rating, text, review_date, source, tour_id, featured, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (options?.featuredOnly) query = query.eq('featured', true);
  if (options?.tourId) query = query.or(`tour_id.is.null,tour_id.eq.${options.tourId}`);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load reviews: ${error.message}`);

  return ((data as unknown as ReviewRow[]) ?? []).map((row) => ({
    id: row.id,
    author: row.author,
    location: row.location,
    rating: row.rating,
    text: row.text,
    reviewDate: row.review_date,
    source: toReviewSource(row.source),
    tourId: row.tour_id,
    featured: row.featured,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }));
}