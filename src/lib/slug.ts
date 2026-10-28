/**
 * Turns a title into a URL-safe slug. Lowercases, replaces any run of
 * non-alphanumeric characters with a single hyphen, and trims leading and
 * trailing hyphens.
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateSlug(value: string): string {
  return slugify(value);
}

export function slugFromTitle(value: string): string {
  return slugify(value);
}

export function toSlug(value: string): string {
  return slugify(value);
}