/// <reference types="astro/client" />

import type { Runtime } from '@astrojs/cloudflare';

declare global {
  namespace App {
    interface Locals {
      supabase: import('@supabase/supabase-js').SupabaseClient | null;
      user: { id: string; email?: string } | null;
      runtime?: Runtime['runtime'];
    }
  }
}