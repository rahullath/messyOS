import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.ts'; // Explicit relative path with .ts extension

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey); // Explicitly type createClient

// Only add auth listener in browser environment
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth event:', event);
    
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (window.location.pathname === '/login') {
        window.location.href = '/';
      }
    } else if (event === 'SIGNED_OUT') {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  });
}
