-- The owner admin reads and edits bookings, inquiries, schedules and blackout
-- dates with their own session (the `authenticated` role), guarded by the
-- `*_admin_all` policies (`using (public.is_admin())`). But 0001 and 0003 also
-- revoked every table privilege from `authenticated`, so Postgres refused the
-- query before row level security was consulted and /admin got "permission
-- denied for table bookings".
--
-- Grant the table privileges back to `authenticated` only. RLS is enabled on
-- every one of these tables and the only policies for `authenticated` require
-- public.is_admin(), so a signed-in non-admin still sees and changes nothing.
-- `anon` stays revoked.

grant select, insert, update, delete
  on public.bookings,
     public.inquiries,
     public.admins,
     public.schedules,
     public.blackout_dates
  to authenticated;
