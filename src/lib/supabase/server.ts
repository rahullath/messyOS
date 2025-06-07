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
          
          // Attempt to find cookie with variations
          const cookieVariations = [
            name,
            `${name}.0`,
            `${name}.1`,
            `${name}.2`,
            `${name}.3`,
            `${name}.4`
          ];

          for (const variant of cookieVariations) {
            const variantCookie = cookies.get(variant);
            if (variantCookie?.value) {
              console.log(`Found cookie variant: ${variant}`);
              return variantCookie.value;
            }
          }

          console.log(`Getting cookie ${name}:`, cookie?.value ? 'exists' : 'not found');
          return cookie?.value;
        },
        set(name: string, value: string, options: any) {
          const isDevelopment = import.meta.env.DEV;
          
          const cookieOptions = {
            ...options,
            sameSite: 'lax' as const,
            httpOnly: false,
            secure: !isDevelopment,
            domain: isDevelopment ? 'localhost' : undefined,
            path: '/'
          };
          
          // Set multiple cookie variants to ensure persistence
          const variants = [name, `${name}.0`, `${name}.1`];
          variants.forEach(variant => {
            console.log(`Setting cookie ${variant}`);
            cookies.set(variant, value, cookieOptions);
          });
        },
        remove(name: string, options: any) {
          const isDevelopment = import.meta.env.DEV;
          
          // Remove multiple cookie variants
          const variants = [
            name, 
            `${name}.0`, 
            `${name}.1`, 
            `${name}.2`, 
            `${name}.3`, 
            `${name}.4`
          ];

          variants.forEach(variant => {
            console.log(`Removing cookie ${variant}`);
            cookies.delete(variant, {
              ...options,
              domain: isDevelopment ? 'localhost' : undefined,
              path: '/'
            });
          });
        },
      },
    }
  )
}
