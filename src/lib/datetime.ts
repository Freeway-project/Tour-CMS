/**
 * Toronto wall-clock helpers.
 *
 * The business runs in `America/Toronto`, but the server renders in UTC. These
 * helpers convert between the two without pulling in a date library, including
 * across daylight-saving changes.
 */

export const TORONTO_TIME_ZONE = 'America/Toronto';

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const dateTimePartsFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TORONTO_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const longDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TORONTO_TIME_ZONE,
  weekday: 'short',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TORONTO_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

const shortDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TORONTO_TIME_ZONE,
  month: 'short',
  day: 'numeric',
});

function partsRecord(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const part of parts) record[part.type] = part.value;
  return record;
}

function torontoParts(date: Date): Required<CalendarDate> & {
  hour: number;
  minute: number;
  second: number;
} {
  const record = partsRecord(dateTimePartsFormatter.formatToParts(date));
  return {
    year: Number(record.year ?? '1970'),
    month: Number(record.month ?? '01'),
    day: Number(record.day ?? '01'),
    hour: Number(record.hour ?? '00'),
    minute: Number(record.minute ?? '00'),
    second: Number(record.second ?? '00'),
  };
}

/** The calendar date in Toronto for an instant. */
export function torontoDate(date: Date): CalendarDate {
  const parts = torontoParts(date);
  return { year: parts.year, month: parts.month, day: parts.day };
}

/** Today's date in Toronto as `YYYY-MM-DD`. */
export function todayInToronto(now: Date = new Date()): string {
  const { year, month, day } = torontoDate(now);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseIsoDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

  const check = new Date(Date.UTC(year, month - 1, day, 12));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

/**
 * The UTC instant for a Toronto wall-clock time. The offset is looked up twice
 * so a date near a daylight-saving change still lands on the right hour.
 */
export function torontoTimeToUtc(
  { year, month, day }: CalendarDate,
  hour: number,
  minute = 0,
): Date {
  const nominal = Date.UTC(year, month - 1, day, hour, minute);
  let utc = nominal;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = torontoParts(new Date(utc));
    const shown = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const offset = shown - Math.floor(utc / 1000) * 1000;
    utc = nominal - offset;
  }

  return new Date(utc);
}

/** Midnight in Toronto for a `YYYY-MM-DD` string, as a UTC instant. */
export function torontoDateStart(value: string): Date | null {
  const parsed = parseIsoDate(value);
  return parsed ? torontoTimeToUtc(parsed, 0) : null;
}

/** Adds whole calendar days, independent of time zone. */
export function addCalendarDays({ year, month, day }: CalendarDate, days: number): CalendarDate {
  const base = new Date(Date.UTC(year, month - 1, day + days, 12));
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

/** `2026-10-28` → `Wed, October 28, 2026` in Toronto time. */
export function formatTorontoDate(instant: string | Date): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  return longDateFormatter.format(date);
}

/** `2026-10-28T12:00:00Z` → `8:00 a.m. EDT` in Toronto time. */
export function formatTorontoTime(instant: string | Date): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  return timeFormatter.format(date);
}

/**
 * Heading for a booking-week group. The week still starts on Monday, but the
 * label names the first date the customer can actually pick (`Week of Nov 1`)
 * rather than a Monday that may be in the previous month.
 */
export function weekOfLabel(instant: string | Date): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  return `Week of ${shortDateFormatter.format(date)}`;
}

/** Validates `YYYY-MM-DD` strings coming from query parameters and forms. */
export function isIsoDate(value: string): boolean {
  return parseIsoDate(value) !== null;
}
