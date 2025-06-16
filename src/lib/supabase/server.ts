import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import type { Database } from '../../types/supabase';

export function createServerClient(cookies?: AstroCookies) {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // If no cookies provided (e.g., for public API routes), use simple client
  if (!cookies) {
    return createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      flowType: 'pkce'
    },
    global: {
      headers: {
        'Cache-Control': 'no-cache'
      }
    },
    cookies: {
      get: (key: string) => cookies.get(key)?.value,
      set: (key: string, value: string, options: any) => {
        cookies.set(key, value, options);
      },
      remove: (key: string, options: any) => {
        cookies.delete(key, options);
      }
    }
  });
}