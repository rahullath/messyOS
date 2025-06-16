import { defineMiddleware } from 'astro/middleware'
import { createServerClient } from './lib/supabase/server'

export const onRequest = defineMiddleware(async (context, next) => {
  // Skip auth for API routes (especially poster fetching)
  if (context.url.pathname.startsWith('/api/')) {
    return next();
  }
  
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
    // USE getUser() instead of getSession() to avoid the warning
    const { data: { user }, error } = await supabase.auth.getUser();
    
    // Only log for page routes, not API routes
    console.log('🔍 Auth Check:', {
      path: context.url.pathname,
      hasUser: !!user,
      userEmail: user?.email,
      error: error?.message
    });

    // Store user for server-side use
    context.locals.user = user;
    context.locals.supabase = supabase;

    // Protected routes
    const protectedRoutes = ['/', '/dashboard', '/habits', '/health', '/finance', '/content', '/tasks', '/import'];
    const isProtectedRoute = protectedRoutes.some(route => 
      context.url.pathname.startsWith(route)
    );

    if (isProtectedRoute && !user) {
      console.log('❌ No user found, redirecting to login');
      return context.redirect('/login');
    }

    return next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return context.redirect('/login');
  }
});