// @ts-check
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

// Astro Actions require a server build output, so the app runs on the
// Cloudflare worker. Marketing pages stay static by setting
// `export const prerender = true`; routes that need the server (actions,
// /api/*, /booking/confirmed) run on demand.
export default defineConfig({
  site: 'https://torontoniagara.ca',
  output: 'server',
  // `compile` optimizes images with sharp at build time: the Cloudflare runtime
  // itself has no sharp, and the marketing pages (where images live) prerender.
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [sitemap()],
  // Reject cross-origin form posts (Astro's default, kept explicit here).
  security: { checkOrigin: true },
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
