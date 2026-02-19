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
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly GEMINI_API_KEY: string;
  readonly CMC_API_KEY: string;
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET: string;
  readonly PUBLIC_APP_URL: string;
  readonly RESEND_API_KEY: string;
  readonly RESEND_FROM_EMAIL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  logHabit: (habitId: string, habitName: string) => Promise<void>;
}
