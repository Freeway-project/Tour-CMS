import type { AvailabilitySlot } from './types';
import { addCalendarDays, torontoDate, torontoTimeToUtc } from './datetime';

/**
 * Availability fixtures.
 *
 * Without Supabase the site still needs a believable calendar: the next 30
 * days, every day at 08:00 Toronto time, with 7 seats. Times are built through
 * the Toronto time zone, so the UTC offset changes correctly across a
 * daylight-saving change (EDT −04:00 → EST −05:00).
 */

export const FIXTURE_DEPARTURE_COUNT = 30;
export const FIXTURE_SEATS_LEFT = 7;

function parseFrom(from: Date | string): { year: number; month: number; day: number } {
  if (typeof from !== 'string') return torontoDate(from);

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from);
  if (!match) {
    const parsed = new Date(from);
    if (Number.isNaN(parsed.getTime())) throw new RangeError(`Invalid date: ${from}`);
    return torontoDate(parsed);
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

/**
 * The next `days` departures (default 30) at 08:00 Toronto time, starting the
 * day after `from`. `from` defaults to today in Toronto.
 */
export function generateFixtureDepartures(
  tourId: string,
  from: Date | string = new Date(),
  days: number = FIXTURE_DEPARTURE_COUNT,
): AvailabilitySlot[] {
  const start = parseFrom(from);
  const count = Math.max(0, Math.trunc(days));
  const departures: AvailabilitySlot[] = [];

  for (let offset = 1; offset <= count; offset += 1) {
    const calendar = addCalendarDays(start, offset);
    const startsAt = torontoTimeToUtc(calendar, 8);
    const isoDate = `${calendar.year}-${String(calendar.month).padStart(2, '0')}-${String(
      calendar.day,
    ).padStart(2, '0')}`;

    departures.push({
      departureId: `departure-fixture-${tourId}-${isoDate}`,
      startsAt: startsAt.toISOString(),
      seatsLeft: FIXTURE_SEATS_LEFT,
    });
  }

  return departures;
}
