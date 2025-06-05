import { createClient, type AuthFlowType } from '@supabase/supabase-js';

export function createServerClient(request?: Request) {
  const supabaseUrl = import.meta.env.SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_ANON_KEY;
  
  const options = request ? {
    auth: {
      flowType: 'pkce' as AuthFlowType,
    },
  } : {};

  return createClient(supabaseUrl, supabaseKey, options);
}
