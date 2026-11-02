import type { Photo } from './types';

/** Public URL of an object in the `tour-images` Storage bucket. */
export function storageImageUrl(supabaseUrl: string, path: string): string {
  const base = supabaseUrl.replace(/\/+$/, '');
  const cleanPath = path
    .replace(/^\/+/, '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${base}/storage/v1/object/public/tour-images/${cleanPath}`;
}

interface StoredPhoto {
  path?: unknown;
  width?: unknown;
  height?: unknown;
  alt?: unknown;
}

/**
 * Reads a `{ path, width, height, alt }` jsonb value from site settings.
 * Anything incomplete is treated as "no photo" so a page never renders a
 * broken or unsized image.
 */
export function parseStoredPhoto(value: unknown, supabaseUrl: string | undefined): Photo | null {
  if (!supabaseUrl || typeof value !== 'object' || value === null) return null;
  const { path, width, height, alt } = value as StoredPhoto;
  if (typeof path !== 'string' || path.trim() === '') return null;
  if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
    return null;
  }
  return {
    src: storageImageUrl(supabaseUrl, path),
    alt: typeof alt === 'string' ? alt : '',
    width,
    height,
  };
}

/** The tour's hero photo: the one marked `isHero`, else none. */
export function heroImage<T extends { isHero: boolean }>(images: T[]): T | null {
  return images.find((image) => image.isHero) ?? null;
}

/** Most photos a hero slideshow cycles through (one CSS keyframe set per count). */
export const MAX_SLIDES = 6;

/**
 * Photos for a hero slideshow built from several tours: the hero image of
 * each tour first (in tour order), then every other image by `sortOrder`.
 * Duplicates are dropped: the same `src`, or the same non-empty alt text (the
 * same photo uploaded to two tours gets two storage paths but one
 * description). The list is capped at `max`.
 */
export function slideshowPhotos<T extends { src: string; alt: string; isHero: boolean; sortOrder: number }>(
  imageSets: T[][],
  max: number = MAX_SLIDES,
): T[] {
  const sorted = imageSets.map((images) => [...images].sort((a, b) => a.sortOrder - b.sortOrder));
  const heroes = sorted.map((images) => heroImage(images)).filter((image): image is T => image !== null);
  const rest = sorted.flatMap((images) => images.filter((image) => !image.isHero));

  const seenSrc = new Set<string>();
  const seenAlt = new Set<string>();
  const result: T[] = [];
  for (const image of [...heroes, ...rest]) {
    const alt = image.alt.trim().toLowerCase();
    if (seenSrc.has(image.src) || (alt !== '' && seenAlt.has(alt))) continue;
    seenSrc.add(image.src);
    if (alt !== '') seenAlt.add(alt);
    result.push(image);
    if (result.length >= max) break;
  }
  return result;
}
