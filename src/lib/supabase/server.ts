import { createClient, type AuthFlowType } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.ts'; // Explicit relative path with .ts extension

// This function will be called from Astro pages/endpoints
// It receives Astro.locals which contains request and cookies
export function createServerClient(locals: any) { // Use 'any' to simplify typing
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  
  // Ensure locals.runtime.cookies is available
  if (!locals.runtime || !locals.runtime.cookies) {
    console.error('Astro.locals.runtime.cookies is not available!');
    // Fallback or throw error if cookies are essential
    // For now, let's return a client that won't work for auth
    return createClient<Database>(supabaseUrl, supabaseKey);
  }

  const cookies = locals.runtime.cookies;
  const request = locals.runtime.request; // Get request from locals

  return createClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true, // Keep this true
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
