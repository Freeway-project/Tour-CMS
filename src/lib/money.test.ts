import { describe, expect, it } from 'vitest';

import { dollarsToCents } from './money';

describe('dollarsToCents', () => {
  it('parses whole dollars', () => {
    expect(dollarsToCents('99')).toBe(9900);
  });
  it('parses one decimal', () => {
    expect(dollarsToCents('99.5')).toBe(9950);
  });
  it('parses thousands with cents', () => {
    expect(dollarsToCents('1,099.00')).toBe(109900);
  });
  it('rejects negatives', () => {
    expect(() => dollarsToCents('-5')).toThrow();
  });
  it('rejects garbage', () => {
    expect(() => dollarsToCents('abc')).toThrow();
    expect(() => dollarsToCents('1.234')).toThrow();
  });
});