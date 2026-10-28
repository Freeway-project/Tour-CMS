import { describe, expect, it } from 'vitest';

import { escapeCsvField, toCsv } from './csv';

describe('escapeCsvField', () => {
  it('leaves plain values alone', () => {
    expect(escapeCsvField('hello')).toBe('hello');
    expect(escapeCsvField(42)).toBe('42');
  });
  it('quotes values with commas', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
  });
  it('doubles embedded quotes', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });
  it('quotes values with newlines', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });
  it('renders null/undefined as empty', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });
});

describe('toCsv', () => {
  it('builds a csv document', () => {
    const csv = toCsv(['a', 'b'], [['1', '2,3']]);
    expect(csv).toBe('a,b\r\n1,"2,3"\r\n');
  });
});