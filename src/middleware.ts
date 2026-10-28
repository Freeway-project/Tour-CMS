import { defineMiddleware } from 'astro:middleware';

import { adminGuard } from './lib/admin-guard';
import { createSupabaseServerClient } from './lib/supabase-server';

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  // Only /admin and /admin/... are protected. /administrator and everything
  // else (including /api) pass through untouched.
  const isAdminRoute = path === '/admin' || path.startsWith('/admin/');
  if (!isAdminRoute) {
    context.locals.supabase = createSupabaseServerClient(context);
    context.locals.user = null;
    return next();
  }

  const supabase = createSupabaseServerClient(context);
  context.locals.supabase = supabase;

  const isLoginPage = path === '/admin/login' || path.startsWith('/admin/login/');

  let userId: string | null = null;
  let isAdmin = false;

  if (supabase && isLoginPage) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    context.locals.user = user ? { id: user.id, email: user.email ?? undefined } : null;
  }

  if (supabase && !isLoginPage) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
    if (user) {
      const { data } = await supabase.rpc('is_admin');
      isAdmin = data === true;
    }
    context.locals.user = user ? { id: user.id, email: user.email ?? undefined } : null;
  }

  const result = adminGuard({
    path,
    configured: supabase !== null,
    userId,
    isAdmin,
  });

  if (result.action === 'redirect') {
    return context.redirect(result.to);
  }

  return next();
});