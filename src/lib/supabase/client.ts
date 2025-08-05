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
    storage: typeof window !== 'undefined' ? localStorage : undefined,
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
      console.log('🍪 Session should be automatically handled by Supabase SSR');
      
      // Debug: check what cookies are actually set
      setTimeout(() => {
        console.log('🔍 Document cookies:', document.cookie);
      }, 100);
    }

    if (event === 'SIGNED_OUT') {
      console.log('👋 User signed out');
      console.log('🍪 Cookies should be automatically cleared by Supabase SSR');
    }
  });
}