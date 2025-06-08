import { defineMiddleware } from 'astro/middleware'
import { createServerClient } from './lib/supabase/server'

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createServerClient(context.cookies);
  
  // Public routes that don't need auth
  const publicRoutes = ['/login', '/auth/callback', '/auth/exchange'];
  const isPublicRoute = publicRoutes.some(route => 
    context.url.pathname === route
  );
  
  if (isPublicRoute) {
    return next();
  }
  
  try {
        const { data: { user }, error } = await supabase.auth.getUser();
        const session = user ? { user } : null; // Simple session object    
    console.log('🔍 Auth Check:', {
      path: context.url.pathname,
      hasSession: !!session,
      userEmail: session?.user?.email,
      error: error?.message
    });

    // Store session for server-side use
    context.locals.session = session;
    context.locals.user = session?.user || null;
    context.locals.supabase = supabase;

    // Protected routes
    const protectedRoutes = ['/', '/dashboard', '/habits', '/health', '/finance', '/content', '/tasks', '/import'];
    const isProtectedRoute = protectedRoutes.some(route => 
      context.url.pathname.startsWith(route)
    );

    if (isProtectedRoute && !session) {
      console.log('❌ No session found, redirecting to login');
      return context.redirect('/login');
    }

    return next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return context.redirect('/login');
  }
});