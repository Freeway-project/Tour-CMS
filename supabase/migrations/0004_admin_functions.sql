-- Admin-callable wrapper around generate_departures.
--
-- `generate_departures` is service_role only (it writes departures for every
-- tour). The admin UI runs as the logged-in user, so it needs a security
-- definer wrapper that first checks `public.is_admin()`.

create or replace function public.admin_generate_departures(p_days integer default 120)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'not_admin' using errcode = '42501';
  end if;

  perform public.generate_departures(p_days);
end;
$$;

revoke execute on function public.admin_generate_departures(integer) from public, anon;
grant execute on function public.admin_generate_departures(integer) to authenticated;