-- Minimal stand-in for what Supabase provides before the migration runs.
-- PGlite tests use this; a real Supabase project already has all of it.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end;
$$;

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key
);

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select null::uuid;
$$;

-- Supabase enables pgcrypto, which provides `gen_random_bytes` to migrations.
-- PGlite ships without contrib extensions, so this stand-in gives the tests the
-- same function. It is never installed in a real project.
create or replace function public.gen_random_bytes(p_bytes integer)
returns bytea
language sql
volatile
as $$
  select substring(
    decode(
      replace(gen_random_uuid()::text, '-', '')
        || replace(gen_random_uuid()::text, '-', ''),
      'hex'
    )
    from 1 for p_bytes
  );
$$;

-- Supabase Storage lives in its own schema with RLS already enabled. A real
-- project has many more columns; these are the ones the migrations touch.
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets (id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;
