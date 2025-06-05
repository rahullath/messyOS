import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase';

export function createServerClient() {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Simple server client without auth persistence for now
  // We'll handle auth through the client-side only
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false, // Disable server-side session persistence
      autoRefreshToken: false, // Disable auto refresh on server
      detectSessionInUrl: false // Disable URL session detection on server
    }
  });
}
