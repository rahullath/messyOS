// src/middleware.ts
import { defineMiddleware } from 'astro/middleware'
import { createServerClient } from './lib/supabase/server'

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createServerClient(context.cookies);
  
  // Store supabase for server-side use in all routes (including API routes)
  context.locals.supabase = supabase;

  // Public routes that don't need auth
  const publicRoutes = ['/login', '/auth/callback', '/auth/exchange'];
  const isPublicRoute = publicRoutes.some(route => 
    context.url.pathname === route
  );
  
  // Skip auth check for public routes and API routes (except for specific API routes that need auth)
  if (isPublicRoute || context.url.pathname.startsWith('/api/')) {
    // For API routes, we still need the supabase client initialized with cookies,
    // but we don't necessarily need to perform an auth check here.
    // Individual API routes can decide if they need authentication.
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
