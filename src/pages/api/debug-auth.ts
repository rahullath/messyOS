import type { APIRoute } from 'astro';
import { createServerAuth } from '../../lib/auth/simple-multi-user';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    // Get all cookies for debugging
    const allCookies: Record<string, string> = {};
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const projectRef = supabaseUrl.split('.')[0].split('//')[1];
    
    const possibleNames = [
      `sb-${projectRef}-auth-token`,
      `sb-${projectRef}-auth-token.0`,
      `sb-${projectRef}-auth-token.1`,
      'supabase-auth-token'
    ];
    
    // Also check all cookies to see what's actually there
    const allCookieNames: string[] = [];
    // Get all cookie names (this is a simple way to inspect what cookies exist)
    try {
      // We can't easily enumerate all cookies server-side, but we can log what we're looking for
      console.log('🔍 Looking for cookies with names:', possibleNames);
    } catch (e) {
      console.log('Error checking cookies:', e);
    }
    
    for (const name of possibleNames) {
      const cookie = cookies.get(name);
      if (cookie) {
        allCookies[name] = cookie.value.substring(0, 50) + '...';
      }
    }

    // Check preferences if user exists
    let preferences = null;
    if (user) {
      preferences = await serverAuth.getUserPreferences(user.id);
    }

    return new Response(JSON.stringify({
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      preferences: preferences ? 'exists' : 'missing',
      cookies: allCookies,
      cookieCount: Object.keys(allCookies).length,
      projectRef,
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};