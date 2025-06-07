// src/lib/auth/helper.ts
import type { AstroCookies } from 'astro';
import { createServerClient } from '../supabase/server';

export async function getAuthenticatedUser(cookies: AstroCookies) {
  const supabase = createServerClient(cookies);
  
  // First try to get the session
  let { data: { session }, error } = await supabase.auth.getSession();
  
  console.log('🔍 Initial session attempt:', session ? 'found' : 'not found');
  
  if (error) {
    console.error('Session error:', error);
  }
  
  // If no session, try to refresh
  if (!session) {
    console.log('🔄 Attempting to refresh session...');
    const refreshResult = await supabase.auth.refreshSession();
    
    if (refreshResult.data.session) {
      console.log('✅ Session refreshed successfully');
      session = refreshResult.data.session;
    } else {
      console.log('❌ Session refresh failed:', refreshResult.error);
    }
  }
  
  // If we have a session, try to get user details
  if (session) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('User fetch error:', userError);
      return { session: null, user: null, supabase };
    }
    
    console.log('👤 User fetched:', user ? user.email : 'none');
    return { session, user, supabase };
  }
  
  return { session: null, user: null, supabase };
}
