import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import type { Database } from '../../types/supabase'
import type { AstroCookies } from 'astro'

export function createServerClient(cookies: AstroCookies) {
  return createSupabaseServerClient<Database>(
    import.meta.env.PUBLIC_SUPABASE_URL!,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookies.get(name);
          return cookie?.value;
        },
        set(name: string, value: string, options: any) {
          cookies.set(name, value, {
            ...options,
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            path: '/'
          });
        },
        remove(name: string, options: any) {
          cookies.delete(name, options);
        },
      },
    }
  )
}