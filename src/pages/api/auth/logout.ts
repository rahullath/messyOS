import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    
    // Sign out from Supabase
    const { error } = await serverAuth.supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
    }
    
    // Clear all possible auth cookies
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const projectRef = supabaseUrl.split('.')[0].split('//')[1];
    
    const cookieNames = [
      `sb-${projectRef}-auth-token`,
      `sb-${projectRef}-auth-token.0`,
      `sb-${projectRef}-auth-token.1`
    ];
    
    for (const cookieName of cookieNames) {
      cookies.delete(cookieName, { path: '/' });
    }
    
    console.log('🚪 User logged out and cookies cleared');
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};