import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ locals, redirect }) => {
  const supabase = locals.supabase;
  if (supabase) await supabase.auth.signOut();
  return redirect('/admin/login');
};

export const GET: APIRoute = async ({ redirect }) => {
  return redirect('/admin/login');
};