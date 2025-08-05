// src/lib/supabase/server.ts
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
          if (cookie?.value) {
            console.log(`🍪 Server found cookie: ${name.substring(0, 20)}...`);
          }
          return cookie?.value;
        },
        set(name: string, value: string, options: any) {
          cookies.set(name, value, {
            ...options,
            httpOnly: false,
            secure: import.meta.env.PROD,
            sameSite: 'lax',
            path: '/'
          });
        },
        remove(name: string, options: any) {
          cookies.delete(name, {
            ...options,
            path: '/'
          });
        },
      },
    }
  )
}