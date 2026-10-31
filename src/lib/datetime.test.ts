import { describe, expect, it } from 'vitest';

import { weekOfLabel } from './datetime';

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
