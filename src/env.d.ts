/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session: import('@supabase/supabase-js').Session | null;
    user: import('@supabase/supabase-js').User | null;
    supabase: import('@supabase/supabase-js').SupabaseClient;
  }
}

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly GEMINI_API_KEY: string;
  readonly CMC_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  logHabit: (habitId: string, habitName: string) => Promise<void>;
}
