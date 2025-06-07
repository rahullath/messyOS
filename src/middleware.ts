import { defineMiddleware } from 'astro/middleware'
import { createServerClient } from './lib/supabase/server'
import type { Session } from '@supabase/supabase-js'

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createServerClient(context.cookies);
  
  try {
    // Attempt multiple methods to retrieve session
    let session: Session | null = null;
    
    // Method 1: Standard session retrieval
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('Primary session retrieval failed:', sessionError);
    } else if (sessionData.session) {
      session = sessionData.session;
    }

    // Method 2: Fallback to checking user directly if session retrieval fails
    if (!session) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('Fallback: User retrieved directly');
        // Reconstruct a minimal session object
        session = {
          access_token: '',
          refresh_token: '',
          expires_at: 0,
          expires_in: 0,
          token_type: '',
          user
        } as Session;
      }
    }
    
    // Log current page and session status with enhanced debugging
    console.log('🔐 Middleware:', {
      path: context.url.pathname,
      sessionMethod: session ? 'retrieved' : 'not found',
      userEmail: session?.user?.email || 'unknown'
    });

    // For development: always allow access with more lenient checks
    if (import.meta.env.DEV) {
      context.locals.session = session;
      return next();
    }

    // Production: redirect logic
    const protectedRoutes = [
      '/', '/dashboard', '/habits', 
      '/health', '/finance', '/content', 
      '/tasks', '/import'
    ];

    const isProtectedRoute = protectedRoutes.some(route => 
      context.url.pathname.startsWith(route)
    );

    // Redirect unauthenticated users from protected routes
    if (isProtectedRoute && !session) {
      return context.redirect('/login');
    }

    // Store session in locals for server-side use
    context.locals.session = session;
    
    return next();
  } catch (error) {
    console.error('Critical authentication middleware failure:', error);
    
    // Absolute fallback: redirect to login for any unhandled errors
    if (context.url.pathname !== '/login') {
      return context.redirect('/login');
    }
    
    return next();
  }
});
