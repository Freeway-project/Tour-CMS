import { describe, expect, it } from 'vitest';

import {
  FIXTURE_DEPARTURE_COUNT,
  FIXTURE_SEATS_LEFT,
  generateFixtureDepartures,
} from './availability';

const torontoClock = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
});

function clockParts(iso: string): { hour: string; minute: string } {
  const record: Record<string, string> = {};
  for (const part of torontoClock.formatToParts(new Date(iso))) record[part.type] = part.value;

  return { hour: record.hour ?? '', minute: record.minute ?? '' };
}

describe('generateFixtureDepartures', () => {
  it('returns 30 departures, each at 08:00 Toronto time with 7 seats', () => {
    const departures = generateFixtureDepartures('tour-niagara-falls-day', '2026-10-25');

    expect(departures).toHaveLength(FIXTURE_DEPARTURE_COUNT);

    for (const departure of departures) {
      expect(clockParts(departure.startsAt)).toEqual({ hour: '08', minute: '00' });
      expect(departure.seatsLeft).toBe(FIXTURE_SEATS_LEFT);
      expect(departure.departureId).toContain('2026-');
    }
  });

  it('switches from EDT (-04:00) to EST (-05:00) across the DST change', () => {
    // DST ends in Toronto on Sunday 1 November 2026 at 02:00.
    const departures = generateFixtureDepartures('tour-niagara-falls-day', '2026-10-25');

    const before = departures.find((departure) => departure.startsAt.startsWith('2026-10-26'));
    const after = departures.find((departure) => departure.startsAt.startsWith('2026-11-02'));

    expect(before?.startsAt).toBe('2026-10-26T12:00:00.000Z');
    expect(after?.startsAt).toBe('2026-11-02T13:00:00.000Z');
  });
});
