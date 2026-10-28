import { defineMiddleware } from 'astro:middleware';

import { createSupabaseServerClient } from './lib/supabase-server';

export const onRequest = defineMiddleware(async (context, next) => {
  const path = context.url.pathname;

  // Only /admin is protected; everything else (including /api) is public.
  if (!path.startsWith('/admin')) return next();

  const supabase = createSupabaseServerClient(context);
  if (!supabase) {
    context.locals.supabase = null;
    context.locals.user = null;
    return context.redirect('/admin/login?error=not_configured');
  }
  context.locals.supabase = supabase;

  // Login page and its assets stay public.
  if (path === '/admin/login' || path.startsWith('/admin/login/')) {
    if (!supabase) {
      context.locals.supabase = null;
      context.locals.user = null;
      return next();
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    context.locals.user = user ? { id: user.id, email: user.email ?? undefined } : null;
    return next();
  }

  if (!supabase) {
    context.locals.supabase = null;
    context.locals.user = null;
    return context.redirect('/admin/login?error=not_configured');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return context.redirect('/admin/login');
  }

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) {
    return context.redirect('/admin/login?error=not_admin');
  }

  context.locals.user = { id: user.id, email: user.email ?? undefined };
  return next();
});