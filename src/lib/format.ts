const cadFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
});

/** Formats integer cents as Canadian dollars, e.g. `15900` → `$159.00`. */
export function formatCad(cents: number): string {
  return cadFormatter.format(cents / 100);
}
