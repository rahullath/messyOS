import { defineMiddleware } from 'astro/middleware'
import { createServerClient } from './lib/supabase/server'

// SINGLE USER HARDCODED AUTH
const ALLOWED_EMAIL = 'ketaminedevs@gmail.com';

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createServerClient(context.cookies);
  
  try {
    // Simplified single-user authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    // Hardcoded user check
    const isAllowedUser = session?.user?.email === ALLOWED_EMAIL;
    
    console.log('🔐 Auth Check:', {
      path: context.url.pathname,
      authenticated: !!isAllowedUser
    });

    // Protected routes
    const protectedRoutes = [
      '/', '/dashboard', '/habits', 
      '/health', '/finance', '/content', 
      '/tasks', '/import'
    ];

    const isProtectedRoute = protectedRoutes.some(route => 
      context.url.pathname.startsWith(route)
    );

    // Redirect logic
    if (isProtectedRoute && !isAllowedUser) {
      return context.redirect('/login');
    }

    // Store session info for server-side use
    context.locals.session = isAllowedUser ? session : null;
    
    return next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Fallback redirect
    if (context.url.pathname !== '/login') {
      return context.redirect('/login');
    }
    
    return next();
  }
});
