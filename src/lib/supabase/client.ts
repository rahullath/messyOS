import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: false, // We handle this manually now
    persistSession: true,
    storage: {
      // Custom storage that also sets cookies
      getItem: (key: string) => {
        const value = localStorage.getItem(key);
        return Promise.resolve(value);
      },
      setItem: (key: string, value: string) => {
        localStorage.setItem(key, value);
        
        // Also set as cookie for server access
        if (key.includes('auth-token')) {
          document.cookie = `${key}=${value}; path=/; max-age=604800; SameSite=Lax`;
        }
        
        return Promise.resolve();
      },
      removeItem: (key: string) => {
        localStorage.removeItem(key);
        
        // Also remove cookie
        if (key.includes('auth-token')) {
          document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
        
        return Promise.resolve();
      }
    }
  }
});

// Auth state change handler
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('Auth event:', event);
  
  if (event === 'SIGNED_IN' && session) {
    console.log('✅ User signed in:', session.user.email);
    
    // Force set session cookie for server access
    const tokenKey = `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`;
    const tokenValue = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user: session.user
    });
    
    document.cookie = `${tokenKey}=${tokenValue}; path=/; max-age=604800; SameSite=Lax`;
    
    console.log('🍪 Session cookie set for server');
  }
});