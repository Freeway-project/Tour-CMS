// @ts-check
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

// Pages prerender by default. Only routes that set `prerender = false` (such as
// /api/health) run on the Cloudflare worker, which keeps the marketing pages on
// the edge cache with zero client-side JS unless a component opts in.
export default defineConfig({
  site: 'https://torontoniagara.ca',
  output: 'static',
  // `compile` optimizes images with sharp at build time: the Cloudflare runtime
  // itself has no sharp, and every page is prerendered today.
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [sitemap()],
  env: {
    schema: {
      PUBLIC_SUPABASE_URL: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_SUPABASE_ANON_KEY: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      SUPABASE_SERVICE_ROLE_KEY: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
