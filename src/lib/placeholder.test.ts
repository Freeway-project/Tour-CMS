import { describe, expect, it } from 'vitest';

import { isPlaceholder } from './placeholder';

describe('isPlaceholder', () => {
  it('treats missing and blank values as placeholders', () => {
    expect(isPlaceholder(null)).toBe(true);
    expect(isPlaceholder(undefined)).toBe(true);
    expect(isPlaceholder('')).toBe(true);
    expect(isPlaceholder('   ')).toBe(true);
  });

  it('treats TODO values as placeholders', () => {
    expect(isPlaceholder('TODO: +1 (416) 555-0142')).toBe(true);
    expect(isPlaceholder('  todo confirm with the owner')).toBe(true);
    expect(isPlaceholder('TODO')).toBe(true);
  });

  it('treats example domains and URLs as placeholders', () => {
    expect(isPlaceholder('https://example.com/todo-google-reviews')).toBe(true);
    expect(isPlaceholder('https://www.example.org/reviews')).toBe(true);
    expect(isPlaceholder('hello@example.com')).toBe(true);
    expect(isPlaceholder('hello@torontoniagara.example')).toBe(true);
  });

  it('accepts real values', () => {
    expect(isPlaceholder('+1 (416) 555-0142')).toBe(false);
    expect(isPlaceholder('65 Front Street West, Toronto, ON')).toBe(false);
    expect(isPlaceholder('Google')).toBe(false);
    expect(isPlaceholder('hello@torontoniagara.ca')).toBe(false);
    expect(isPlaceholder('https://maps.google.com/?q=torontoniagara')).toBe(false);
  });
});
