import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

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
