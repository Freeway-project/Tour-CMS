import { CF_DEPLOY_HOOK_URL } from 'astro:env/server';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Triggers a Cloudflare Pages rebuild, rate-limited to once per 60 seconds
 * using `site_settings.last_publish_at`. Fire-and-forget: never throws.
 *
 * The caller passes the logged-in admin's Supabase client (RLS allows admins
 * to update `site_settings`) and, on Cloudflare, the request's `waitUntil`
 * so the fetch is not cancelled when the response ends.
 */
export async function triggerPublish(
  supabase: SupabaseClient | null,
  waitUntil?: (promise: Promise<unknown>) => void,
): Promise<void> {
  const hook = CF_DEPLOY_HOOK_URL;
  if (!hook) return;
  if (!supabase) return;

  const { data } = await supabase
    .from('site_settings')
    .select('last_publish_at')
    .eq('id', 1)
    .maybeSingle();

  const last = (data as { last_publish_at: string | null } | null)?.last_publish_at;
  const lastTime = last ? Date.parse(last) : 0;
  if (Date.now() - lastTime < 60_000) return;

  await supabase.from('site_settings').update({ last_publish_at: new Date().toISOString() }).eq('id', 1);

  // Fire and forget; keep the worker alive with waitUntil when available.
  const promise = fetch(hook, { method: 'POST' }).catch(() => undefined);
  if (waitUntil) {
    waitUntil(promise);
  } else {
    void promise;
  }
}