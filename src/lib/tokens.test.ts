import { describe, expect, it } from 'vitest';

import { tokensMatch } from './tokens';

describe('tokensMatch', () => {
  const token = 'a'.repeat(48);

  it('accepts the exact token', () => {
    expect(tokensMatch(token, token)).toBe(true);
  });

  it('rejects a different token of the same length', () => {
    expect(tokensMatch(token, `${'a'.repeat(47)}b`)).toBe(false);
  });

  it('rejects a token that only differs at the start', () => {
    expect(tokensMatch(token, `b${'a'.repeat(47)}`)).toBe(false);
  });

  it('rejects a missing or shorter token', () => {
    expect(tokensMatch(token, '')).toBe(false);
    expect(tokensMatch(token, 'a')).toBe(false);
    expect(tokensMatch(token, null)).toBe(false);
    expect(tokensMatch(null, token)).toBe(false);
  });
});
