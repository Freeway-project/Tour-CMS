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
