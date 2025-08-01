import { createClient } from '@supabase/supabase-js';
export { createServerClient } from '@supabase/ssr';
import type { Database } from '../../types/supabase';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const createSupabaseClient = () => {
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: true,
      storage:
        typeof window !== 'undefined'
          ? {
              getItem: (key: string) => {
                return localStorage.getItem(key);
              },
              setItem: (key: string, value: string) => {
                localStorage.setItem(key, value);
              },
              removeItem: (key: string) => {
                localStorage.removeItem(key);
              },
            }
          : undefined,
    },
  });
};

export const supabase = createSupabaseClient();

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event);

    if (event === 'SIGNED_IN' && session) {
      console.log('✅ User signed in:', session.user.email);

      const tokenKey = `sb-${
        supabaseUrl.split('//')[1].split('.')[0]
      }-auth-token`;
      const tokenValue = JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
        user: session.user,
      });

      document.cookie = `${tokenKey}=${tokenValue}; path=/; max-age=604800; SameSite=Lax`;
      console.log('🍪 Session cookie set for server');
    }
  });
}
