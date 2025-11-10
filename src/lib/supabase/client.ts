// Re-export enhanced auth client and maintain backward compatibility
export { createServerClient } from '@supabase/ssr';
export { authClient as supabase, createAuthClient as createSupabaseClient } from '../auth/config';
export type { Database } from '../../types/supabase';