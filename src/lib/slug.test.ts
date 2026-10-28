import { describe, expect, it } from 'vitest';

import { slugify } from './slug';

describe('slugify', () => {
  it('slugifies a title', () => {
    expect(slugify('Niagara Falls Day Tour')).toBe('niagara-falls-day-tour');
  });
  it('collapses punctuation', () => {
    expect(slugify('  Hello, World!!  ')).toBe('hello-world');
  });
});