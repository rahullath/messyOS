import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.ts'; // Explicit relative path with .ts extension

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey); // Explicitly type createClient

// Listen for auth changes and log session
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event);
  console.log('Session:', session);

  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    // Optionally redirect to dashboard if not already there
    if (window.location.pathname === '/login') {
      window.location.href = '/';
    }
  } else if (event === 'SIGNED_OUT') {
    // Optionally redirect to login if signed out
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
});
