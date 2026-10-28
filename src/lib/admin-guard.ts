/**
 * Pure decision logic for protecting `/admin` routes. Kept separate from the
 * Astro middleware so it can be unit-tested without a request context.
 */

export interface AdminGuardInput {
  path: string;
  configured: boolean;
  userId: string | null;
  isAdmin: boolean;
}

export type AdminGuardResult =
  | { action: 'next' }
  | { action: 'redirect'; to: string };

/**
 * Returns the action the middleware should take for a given request.
 *
 * Only `/admin` and `/admin/...` are protected; `/administrator` and every
 * other path pass through. The login page always renders (even when Supabase
 * is not configured) so there is no redirect loop.
 */
export function adminGuard(input: AdminGuardInput): AdminGuardResult {
  const { path, configured, userId, isAdmin } = input;

  const isAdminRoute = path === '/admin' || path.startsWith('/admin/');
  if (!isAdminRoute) return { action: 'next' };

  const isLoginPage = path === '/admin/login' || path.startsWith('/admin/login/');
  if (isLoginPage) return { action: 'next' };

  if (!configured) {
    return { action: 'redirect', to: '/admin/login?error=not_configured' };
  }
  if (!userId) {
    return { action: 'redirect', to: '/admin/login' };
  }
  if (!isAdmin) {
    return { action: 'redirect', to: '/admin/login?error=not_admin' };
  }
  return { action: 'next' };
}