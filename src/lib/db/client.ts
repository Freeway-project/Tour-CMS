import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from 'astro:env/client';

/**
 * Browser-safe Supabase client. Built from the public env vars only, so it can
 * be imported by server-rendered pages without ever exposing a secret.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` is server-only and deliberately not imported here:
 * privileged writes go through the `reserve_booking` SQL function or a server
 * route.
 */

const url = PUBLIC_SUPABASE_URL;
const anonKey = PUBLIC_SUPABASE_ANON_KEY;

/** False when the site is built without Supabase configured (fixtures are used). */
export const hasSupabase =
  url !== undefined && url !== '' && anonKey !== undefined && anonKey !== '';

export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: false } }) : null;
