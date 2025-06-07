import { defineMiddleware, sequence } from 'astro/middleware';
import { createServerClient } from './lib/supabase/server';

const supabaseAuth = defineMiddleware(async (context, next) => {
  console.log('🔐 Middleware executing for:', context.url.pathname);
  
  // Log all cookies for debugging
  // AstroCookies is not directly iterable, so we'll log its keys
  console.log('📝 All cookies available (keys only):', Object.keys(context.cookies));
  
  // Note: To get values, you'd typically iterate with context.cookies.get(key)
  // For example:
  // for (const key of Object.keys(context.cookies)) {
  //   console.log(`Cookie ${key}:`, context.cookies.get(key));
  // }
  
  // Look for Supabase auth cookies specifically
  const authCookies = Object.keys(context.cookies).filter(key => 
    key.includes('supabase') || key.includes('auth') || key.includes('sb-')
  );
  console.log('🔑 Auth-related cookies:', authCookies);
  
  // Create Supabase client
  const supabase = createServerClient(context.cookies);
  
  // Get session with detailed logging
  console.log('🔄 Attempting to get session...');
  const {
    data: { session },
    error
  } = await supabase.auth.getSession();
  
  if (error) {
    console.error('❌ Session error:', error);
  }
  
  console.log('📊 Session object in middleware:', session ? {
    user_id: session.user?.id,
    email: session.user?.email,
    expires_at: session.expires_at
  } : null);
  
  // Store session in locals for use in pages
  context.locals.session = session;
  context.locals.supabase = supabase;

  // Protected routes that require authentication
  const protectedRoutes = ['/habits', '/tasks', '/health', '/finance', '/content'];
  const isProtectedRoute = protectedRoutes.some(route => 
    context.url.pathname.startsWith(route)
  );

  // Redirect to login if accessing protected route without session
  if (isProtectedRoute && !session) {
    console.log('🚫 Redirecting to login - no session for protected route');
    return context.redirect('/login');
  }

  // Redirect to dashboard if accessing login with active session
  if (context.url.pathname === '/login' && session) {
    console.log('✅ Redirecting to dashboard - already logged in');
    return context.redirect('/');
  }

  return next();
});

export const onRequest = sequence(supabaseAuth);
