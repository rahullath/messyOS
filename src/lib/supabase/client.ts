import { createClient } from '@supabase/supabase-js';
export { createServerClient } from '@supabase/ssr';
import type { Database } from '../../types/supabase';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    storage: typeof window !== 'undefined' ? {
      getItem: (key: string) => {
        return localStorage.getItem(key);
      },
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key);
      },
    } : undefined,
  },
});

// Enhanced auth state change handler
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event);

    if (event === 'SIGNED_IN' && session) {
      console.log('✅ User signed in:', session.user.email);
      
      // Set multiple cookie formats to ensure server can read them
      const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
      const projectRef = supabaseUrl.split('.')[0].split('//')[1];
      
      const tokenData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user,
      };
      
      const tokenValue = JSON.stringify(tokenData);
      
      // Set multiple cookie names for compatibility
      const cookieNames = [
        `sb-${projectRef}-auth-token`,
        `sb-${projectRef}-auth-token.0`,
        `sb-${projectRef}-auth-token.1`
      ];
      
      for (const cookieName of cookieNames) {
        document.cookie = `${cookieName}=${tokenValue}; path=/; max-age=604800; SameSite=Lax`;
      }
      
      console.log('🍪 Session cookies set for server');
    }

    if (event === 'SIGNED_OUT') {
      console.log('👋 User signed out');
      
      // Clear all possible cookie names
      const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
      const projectRef = supabaseUrl.split('.')[0].split('//')[1];
      
      const cookieNames = [
        `sb-${projectRef}-auth-token`,
        `sb-${projectRef}-auth-token.0`,
        `sb-${projectRef}-auth-token.1`
      ];
      
      for (const cookieName of cookieNames) {
        document.cookie = `${cookieName}=; path=/; max-age=0`;
      }
    }
  });
}