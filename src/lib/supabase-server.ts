import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from 'astro:env/client';

import type { AstroCookies } from 'astro';

export function createSupabaseServerClient(context: { cookies: AstroCookies }): ReturnType<
  typeof createServerClient
> | null {
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) return null;

  return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      get(key: string) {
        return context.cookies.get(key)?.value;
      },
      set(key: string, value: string, options: Record<string, unknown>) {
        context.cookies.set(key, value, options as never);
      },
      remove(key: string, options: Record<string, unknown>) {
        context.cookies.delete(key, options as never);
      },
    },
  });
}