import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from 'astro:env/client';
import { SUPABASE_SERVICE_ROLE_KEY } from 'astro:env/server';

/**
 * Server-only Supabase client.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS, so this module must only ever be
 * imported from server code (actions, server routes, on-demand pages). The
 * `astro:env` declaration for the key is `context: "server", access: "secret"`,
 * which makes Vite fail the build if it leaks into a client bundle.
 */

let cached: SupabaseClient | null | undefined;

export function getAdminClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  cached =
    PUBLIC_SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
      ? createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;

  return cached;
}

/** True when bookings and inquiries can be written to the database. */
export function isBookingConfigured(): boolean {
  return getAdminClient() !== null;
}
