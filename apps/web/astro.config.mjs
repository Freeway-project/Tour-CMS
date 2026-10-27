// @ts-check
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// Static output keeps the marketing pages on Cloudflare Pages' edge cache and
// ships zero client-side JS unless a component explicitly hydrates.
export default defineConfig({
  site: 'https://example.com',
  output: 'static',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
