export const prerender = false;

import { toCsvRow } from '../../lib/csv';
import { formatTorontoDate, formatTorontoTime } from '../../lib/datetime';

export async function GET(context: {
  url: URL;
  locals: App.Locals;
  redirect: (path: string) => Response;
}) {
  const supabase = context.locals.supabase;
  if (!supabase) {
    return new Response('Not configured', { status: 503 });
  }

  // Admin check (middleware already enforces, but be explicit).
  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (isAdmin !== true) {
    return new Response('Forbidden', { status: 403 });
  }

  const url = context.url;
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';

  const fromDate = from ? new Date(`${from}T00:00:00Z`) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(`${to}T23:59:59Z`) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('bookings')
    .select('reference, customer_name, customer_email, customer_phone, adults, children, seniors, total_cents, status, notes, created_at, departures(starts_at, tours(title))')
    .gte('created_at', fromDate.toISOString())
    .lte('created_at', toDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const rows = (data ?? []).map((b: Record<string, unknown>) => {
    const dep = b.departures as { starts_at: string; tours: { title: string } | null } | null;
    const startsAt = dep?.starts_at;
    return [
      b.reference,
      b.customer_name,
      b.customer_email,
      b.customer_phone,
      dep?.tours?.title ?? '',
      startsAt ? `${formatTorontoDate(startsAt)} ${formatTorontoTime(startsAt)}` : '',
      b.adults,
      b.children,
      b.seniors,
      ((b.total_cents as number) / 100).toFixed(2),
      b.status,
      b.notes,
      b.created_at,
    ];
  });

  const header = [
    'reference',
    'customer_name',
    'customer_email',
    'customer_phone',
    'tour',
    'departure_toronto',
    'adults',
    'children',
    'seniors',
    'total_cad',
    'status',
    'notes',
    'created_at',
  ];

  const csv = [toCsvRow(header), ...rows.map(toCsvRow)].join('\r\n') + '\r\n';

  const filename = `bookings-${from || 'all'}-${to || 'all'}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}