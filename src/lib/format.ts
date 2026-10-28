const cadFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

const cadWholeFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

/** Formats integer cents as Canadian dollars, e.g. `15900` → `$159.00`. */
export function formatCad(cents: number): string {
  return cadFormatter.format(cents / 100);
}

/**
 * Formats an advertised "from" price: a whole-dollar amount renders without cents,
 * they are not zero (`9950` → `$99.50`) so the headline is never rounded down.
 */
export function formatCadHeadline(cents: number): string {
  return cents % 100 === 0 ? cadWholeFormatter.format(cents / 100) : formatCad(cents);
}
