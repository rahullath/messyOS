import { createClient, type AuthFlowType } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.ts'; // Explicit relative path with .ts extension

// Define a simple interface for the cookies object that matches Astro.cookies
interface CookieMethods {
  get: (key: string) => { value: string } | undefined;
  set: (key: string, value: string, options?: object) => void;
  delete: (key: string) => void;
}

export function createServerClient(cookies: CookieMethods) {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  
  return createClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        storage: {
          getItem: (key) => cookies.get(key)?.value,
          setItem: (key, value) => cookies.set(key, value, { path: '/' }),
          removeItem: (key) => cookies.delete(key),
        },
      },
      global: {
        headers: {
          'x-supabase-api-key': supabaseKey,
        },
      },
    }
  );
}
