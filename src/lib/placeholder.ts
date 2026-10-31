/**
 * Placeholder detection for content the owner has not filled in yet.
 *
 * Fixtures and new admin rows use `TODO: …` until the owner saves a real value.
 * Reserved example domains (`example.com`, `.example`) are placeholders too, so
 * they must never reach a public page.
 */

const TODO_PREFIX = 'todo';
const EXAMPLE_DOMAIN = /(?:^|[.@/])example\.(?:com|org|net)(?:[/:?#]|$)/i;
const EXAMPLE_TLD = /[.@]example(?:[/:?#]|$)/i;

/** True for empty values, `TODO…` strings and reserved example domains/URLs. */
export function isPlaceholder(value: string | null | undefined): boolean {
  if (value === null || value === undefined) return true;

  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.toLowerCase().startsWith(TODO_PREFIX)) return true;
  if (EXAMPLE_DOMAIN.test(trimmed)) return true;
  if (EXAMPLE_TLD.test(trimmed)) return true;

  return false;
}
