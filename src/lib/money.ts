/**
 * Parses a dollar amount into integer cents. Accepts `"99"`, `"99.5"` and
 * `"1,099.00"`; rejects negatives, empty input and anything that is not a
 * plain dollar amount.
 */
export function dollarsToCents(value: string | number): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) throw new Error('invalid_dollar_amount');
    return Math.round(value * 100);
  }

  const trimmed = value.trim();
  if (trimmed === '') throw new Error('invalid_dollar_amount');

  const normalized = trimmed.replace(/,/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error('invalid_dollar_amount');
  }

  const [wholePart, fractionPart = ''] = normalized.split('.');
  const whole = Number(wholePart);
  const fraction = Number((fractionPart + '00').slice(0, 2));
  const cents = whole * 100 + fraction;

  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error('invalid_dollar_amount');
  }
  return cents;
}

export const parseDollarsToCents = dollarsToCents;
export const parseDollars = dollarsToCents;
export const parseMoney = dollarsToCents;
export const toCents = dollarsToCents;