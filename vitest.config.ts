import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Astro's virtual env module only exists inside an Astro build.
      'astro:env/server': fileURLToPath(new URL('./src/test/astro-env-server.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts', 'supabase/tests/**/*.test.ts'],
    testTimeout: 30_000,
    // Each PGlite database is built from every migration in beforeEach; under a
    // parallel run that can take longer than the 10 s default.
    hookTimeout: 30_000,
  },
});
