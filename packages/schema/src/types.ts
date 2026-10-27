import type { PortableTextBlock } from '@portabletext/types';

/** An image that has been resolved for the frontend (no Sanity asset reference). */
export interface ImageWithAlt {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** A map pin, resolved for the frontend. */
export interface GeoPoint {
  lat: number;
  lng: number;
  alt?: number;
}

export interface Seo {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: ImageWithAlt;
  noIndex?: boolean;
}

export interface PriceTier {
  label: string;
  priceCad: number;
  note?: string;
}

export interface ItineraryStop {
  time?: string;
  title: string;
  description?: string;
  durationMinutes?: number;
}

export interface FaqItem {
  question: string;
  answer?: PortableTextBlock[];
}

export type CtaButtonKind = 'book' | 'link' | 'phone' | 'whatsapp';

export interface CtaButton {
  label: string;
  kind: CtaButtonKind;
  url?: string;
}

export type TourStatus = 'active' | 'seasonal' | 'hidden';

export type BookingProvider = 'fareharbor' | 'bokun' | 'peek' | 'none';

export interface TourBooking {
  provider: BookingProvider;
  productId?: string;
  bookingUrl?: string;
}

export interface Tour {
  _id: string;
  _type: 'tour';
  title: string;
  slug: string;
  status: TourStatus;
  shortDescription: string;
  body?: PortableTextBlock[];
  heroImage: ImageWithAlt;
  gallery?: ImageWithAlt[];
  durationHours: number;
  startTime?: string;
  groupSizeMax?: number;
  priceTiers: PriceTier[];
  /** Lowest price across the tiers. Computed by the frontend. */
  fromPriceCad: number;
  highlights?: string[];
  included?: string[];
  notIncluded?: string[];
  itinerary?: ItineraryStop[];
  /** Resolved references (not Sanity `_ref`s). */
  pickupLocations: PickupLocation[];
  faqs?: FaqItem[];
  /** Resolved references (not Sanity `_ref`s). */
  reviews: Review[];
  booking: TourBooking;
  seasonalNote?: string;
  seo?: Seo;
}

export type ReviewSource = 'google' | 'tripadvisor' | 'facebook' | 'direct';

export interface Review {
  _id: string;
  _type: 'review';
  authorName: string;
  authorLocation?: string;
  rating: number;
  text: string;
  /** ISO date, e.g. "2026-07-14". */
  date: string;
  source: ReviewSource;
  sourceUrl?: string;
  featured?: boolean;
}

export interface PickupLocation {
  _id: string;
  _type: 'pickupLocation';
  name: string;
  address: string;
  geo?: GeoPoint;
  pickupTime?: string;
  notes?: string;
}

export interface Guide {
  _id: string;
  _type: 'guide';
  name: string;
  photo?: ImageWithAlt;
  bio?: string;
  languages?: string[];
}

export type SocialPlatform =
  'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'tripadvisor' | 'google';

export interface SocialLink {
  platform?: SocialPlatform;
  url?: string;
}

export interface AnnouncementBar {
  enabled?: boolean;
  text?: string;
  link?: string;
}

export interface TrustBadge {
  label?: string;
  image?: ImageWithAlt;
}

export interface SiteSettings {
  _id: string;
  _type: 'siteSettings';
  siteName: string;
  tagline?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  address?: string;
  logo?: ImageWithAlt;
  defaultSeo?: Seo;
  socialLinks?: SocialLink[];
  announcementBar?: AnnouncementBar;
  trustBadges?: TrustBadge[];
}

export type BenefitIcon = 'clock' | 'bus' | 'users' | 'ticket' | 'shield' | 'star';

export interface Benefit {
  icon?: BenefitIcon;
  title?: string;
  text?: string;
}

export interface HeroSection {
  _type: 'heroSection';
  _key?: string;
  image?: ImageWithAlt;
  showRating?: boolean;
  cta?: CtaButton;
}

export interface BenefitsSection {
  _type: 'benefitsSection';
  _key?: string;
  heading?: string;
  items?: Benefit[];
}

export interface ItinerarySection {
  _type: 'itinerarySection';
  _key?: string;
  heading?: string;
}

export interface ReviewsSection {
  _type: 'reviewsSection';
  _key?: string;
  heading?: string;
  /** Resolved references (not Sanity `_ref`s). */
  reviews?: Review[];
}

export interface FaqSection {
  _type: 'faqSection';
  _key?: string;
  heading?: string;
  items?: FaqItem[];
}

export interface CtaSection {
  _type: 'ctaSection';
  _key?: string;
  heading?: string;
  text?: string;
  cta?: CtaButton;
}

export type LandingSection =
  HeroSection | BenefitsSection | ItinerarySection | ReviewsSection | FaqSection | CtaSection;

export type LandingPageVariant = 'A' | 'B';

export interface LandingPage {
  _id: string;
  _type: 'landingPage';
  title: string;
  slug: string;
  /** Resolved reference (not a Sanity `_ref`). */
  tour: Tour;
  variant: LandingPageVariant;
  utmCampaign?: string;
  headline: string;
  subheadline?: string;
  sections: LandingSection[];
  seo?: Seo;
}
