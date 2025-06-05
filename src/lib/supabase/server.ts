import { createClient, type AuthFlowType } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase'; // Import Database type

export function createServerClient(request?: Request) {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  
  const options = request ? {
    auth: {
      flowType: 'pkce' as AuthFlowType,
    },
  } : {};

  return createClient<Database>(supabaseUrl, supabaseKey, options); // Explicitly type createClient
}
