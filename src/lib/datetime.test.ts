import { describe, expect, it } from 'vitest';

import { formatTorontoDateTime, weekOfLabel, formatClockTime } from './datetime';

describe('weekOfLabel', () => {
  it('labels a group by its first listed date, not the Monday before it', () => {
    expect(weekOfLabel('2026-11-01T08:00:00-04:00')).toBe('Week of Nov 1');
  });

  it('keeps the Toronto calendar date for a late-evening instant', () => {
    expect(weekOfLabel('2026-11-02T03:30:00Z')).toBe('Week of Nov 1');
  });

  it('accepts a Date as well as an ISO string', () => {
    expect(weekOfLabel(new Date('2026-12-07T13:00:00Z'))).toBe('Week of Dec 7');
  });
});

describe('formatTorontoDateTime', () => {
  it('shows Toronto wall-clock time whatever the server time zone', () => {
    expect(formatTorontoDateTime('2026-11-22T13:00:00Z')).toMatch(/November 22, 2026, 8:00\sa\.m\. EST$/);
    expect(formatTorontoDateTime('2026-07-01T12:00:00Z')).toMatch(/July 1, 2026, 8:00\sa\.m\. EDT$/);
  });
});

describe('formatClockTime', () => {
  it('formats database times the Canadian way', () => {
    expect(formatClockTime('07:45:00')).toBe('7:45 a.m.');
    expect(formatClockTime('12:00')).toBe('12:00 p.m.');
    expect(formatClockTime('00:30')).toBe('12:30 a.m.');
    expect(formatClockTime('18:05:00')).toBe('6:05 p.m.');
    expect(formatClockTime('later')).toBe('later');
  });
});
