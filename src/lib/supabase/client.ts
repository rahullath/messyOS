import { createClient } from '@supabase/supabase-js';
export { createServerClient } from '@supabase/ssr';
import type { Database } from '../../types/supabase';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Export function for creating Supabase client
export const createSupabaseClient = () => createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    storage: {
      // Custom storage that syncs localStorage with cookies for SSR compatibility
      getItem: (key: string) => {
        if (typeof window === 'undefined') return null;
        return window.localStorage.getItem(key);
      },
      setItem: (key: string, value: string) => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(key, value);
      },
      removeItem: (key: string) => {
        if (typeof window === 'undefined') return;
        window.localStorage.removeItem(key);
      },
    },
  },
});

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    storage: {
      // Custom storage that syncs localStorage with cookies for SSR compatibility
      getItem: (key: string) => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(key);
      },
      setItem: (key: string, value: string) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem(key, value);
        
        // Set cookie for SSR access without encoding the value
        // Let Supabase SSR handle the cookie format properly
        if (key.includes('auth-token')) {
          const projectRef = supabaseUrl.split('.')[0].split('//')[1];
          document.cookie = `sb-${projectRef}-auth-token=${value}; path=/; max-age=604800; SameSite=Lax; ${import.meta.env.PROD ? 'Secure;' : ''}`;
        }
      },
      removeItem: (key: string) => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(key);
        
        // Remove cookie
        if (key.includes('auth-token')) {
          const projectRef = supabaseUrl.split('.')[0].split('//')[1];
          document.cookie = `sb-${projectRef}-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      }
    },
  },
});

// Initialize session on page load
if (typeof window !== 'undefined') {
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      console.log('Session initialization error:', error);
    } else if (session) {
      console.log('✅ Found existing session for:', session.user.email);
    }
  });
}

// Enhanced auth state change handler
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔄 Auth event:', event, session ? 'with session' : 'no session');

    if (event === 'SIGNED_IN' && session) {
      console.log('✅ User signed in:', session.user.email);
      console.log('🍪 Session storage handled by Supabase SSR');
    }

    if (event === 'SIGNED_OUT') {
      console.log('👋 User signed out');
      console.log('🍪 Cookies cleared by Supabase SSR');
    }
  });
}