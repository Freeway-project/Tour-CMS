/**
 * CSV helpers. `escapeCsvField` quotes a field when it contains a comma, quote
 * or newline, and doubles any embedded quotes, per RFC 4180.
 */

export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export const escapeCsv = escapeCsvField;
export const csvEscape = escapeCsvField;
export const csvEscapeField = escapeCsvField;

export function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsvField).join(',');
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [toCsvRow(headers), ...rows.map(toCsvRow)].join('\r\n') + '\r\n';
}