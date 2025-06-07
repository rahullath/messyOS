// src/middleware.ts
// src/middleware.ts
import { defineMiddleware } from 'astro/middleware'
import { createServerClient } from './lib/supabase/server'

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createServerClient(context.cookies);
  
  // Try to get session from server-side cookies
  const { data: { session }, error } = await supabase.auth.getSession();
  
  console.log('🔐 Middleware - Path:', context.url.pathname);
  console.log('📊 Server session:', session ? `${session.user.email}` : 'null');
  
  // Store in locals
  context.locals.session = session;
  context.locals.supabase = supabase;

  // For development: bypass auth requirements since cookies aren't working
  // This allows you to see the UI and test functionality
  if (import.meta.env.DEV) {
    console.log('🚧 DEV MODE: Auth checks bypassed');
    return next();
  }

  // Production auth logic
  const protectedRoutes = ['/habits', '/tasks', '/health', '/finance', '/content'];
  const isProtectedRoute = protectedRoutes.some(route => 
    context.url.pathname.startsWith(route)
  );

  if (isProtectedRoute && !session) {
    console.log('🚫 Redirecting to login - no session for protected route');
    return context.redirect('/login');
  }

  if (context.url.pathname === '/login' && session) {
    console.log('✅ Redirecting to dashboard - already logged in');
    return context.redirect('/');
  }

  return next();
});