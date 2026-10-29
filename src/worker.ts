import { createClient } from '@supabase/supabase-js';
import { createExports as createBaseExports } from '@astrojs/cloudflare/entrypoints/server.js';
import type { SSRManifest } from 'astro';

/**
 * Wraps Astro's Cloudflare entrypoint so we can also export a `scheduled`
 * handler for the cron triggers. The daily job keeps departures generated and
 * the free Supabase project from pausing; the 15-minute job releases abandoned
 * booking holds.
 */

/** Must match `triggers.crons` in `wrangler.jsonc`. */
const EXPIRE_HOLDS_CRON = '*/15 * * * *';

interface ScheduledEvent {
  cron?: string;
}

export function createExports(manifest: SSRManifest) {
  const base = createBaseExports(manifest);

  return {
    default: base.default,
    scheduled: async (event: ScheduledEvent, env: Record<string, unknown>) => {
      const url = typeof env.PUBLIC_SUPABASE_URL === 'string' ? env.PUBLIC_SUPABASE_URL : '';
      const key =
        typeof env.SUPABASE_SERVICE_ROLE_KEY === 'string' ? env.SUPABASE_SERVICE_ROLE_KEY : '';
      if (!url || !key) return;

      const client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      if (event.cron === EXPIRE_HOLDS_CRON) {
        await client.rpc('expire_holds');
        return;
      }

      await client.rpc('generate_departures', { p_days: 120 });
      await client.rpc('expire_holds');
    },
  };
}
