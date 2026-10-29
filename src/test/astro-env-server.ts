/**
 * Vitest stand-in for Astro's virtual `astro:env/server` module.
 *
 * Tests run outside Astro, so the module is aliased to this file in
 * `vitest.config.ts`. Everything is unset by default: tests that need a
 * configured service pass its config explicitly.
 */

export const PUBLIC_SUPABASE_URL: string | undefined = undefined;
export const PUBLIC_SUPABASE_ANON_KEY: string | undefined = undefined;
export const SUPABASE_SERVICE_ROLE_KEY: string | undefined = undefined;
export const STRIPE_SECRET_KEY: string | undefined = undefined;
export const STRIPE_WEBHOOK_SECRET: string | undefined = undefined;
export const RESEND_API_KEY: string | undefined = undefined;
export const EMAIL_FROM: string | undefined = undefined;
export const CF_DEPLOY_HOOK_URL: string | undefined = undefined;
