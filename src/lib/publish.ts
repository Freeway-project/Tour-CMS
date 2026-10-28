import { CF_DEPLOY_HOOK_URL } from 'astro:env/server';

import { getAdminClient } from './db/admin';

/**
 * Triggers a Cloudflare Pages rebuild, rate-limited to once per 60 seconds
 * using `site_settings.last_publish_at`. Fire-and-forget: never throws.
 */
export async function triggerPublish(): Promise<void> {
  const hook = CF_DEPLOY_HOOK_URL;
  if (!hook) return;

  const admin = getAdminClient();
  if (!admin) return;

  const { data } = await admin
    .from('site_settings')
    .select('last_publish_at')
    .eq('id', 1)
    .maybeSingle();

  const last = (data as { last_publish_at: string | null } | null)?.last_publish_at;
  const lastTime = last ? Date.parse(last) : 0;
  if (Date.now() - lastTime < 60_000) return;

  await admin
    .from('site_settings')
    .update({ last_publish_at: new Date().toISOString() })
    .eq('id', 1);

  // Fire and forget.
  void fetch(hook, { method: 'POST' }).catch(() => undefined);
}
