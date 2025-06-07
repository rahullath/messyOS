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
          console.log(`Getting cookie ${name}:`, cookie?.value ? 'exists' : 'not found');
          return cookie?.value;
        },
        set(name: string, value: string, options: any) {
          console.log(`Setting cookie ${name} with options:`, options);
          
          // Determine if we're in development
          const isDevelopment = import.meta.env.DEV || 
                               (typeof window !== 'undefined' && window.location.hostname === 'localhost');
          
          const cookieOptions = {
            ...options,
            sameSite: 'lax' as const,
            httpOnly: false,
            secure: !isDevelopment, // Only secure in production
            domain: isDevelopment ? 'localhost' : undefined, // Explicit domain for dev
            path: '/'
          };
          
          console.log(`Final cookie options for ${name}:`, cookieOptions);
          cookies.set(name, value, cookieOptions);
        },
        remove(name: string, options: any) {
          console.log(`Removing cookie ${name}`);
          const isDevelopment = import.meta.env.DEV;
          
          cookies.delete(name, {
            ...options,
            domain: isDevelopment ? 'localhost' : undefined,
            path: '/'
          });
        },
      },
    }
  )
}
