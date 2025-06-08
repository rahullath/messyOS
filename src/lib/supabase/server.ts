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
          // Comprehensive cookie retrieval strategy
          const cookieVariations = [
            name,
            `${name}.0`,
            `${name}.1`,
            `${name}.2`,
            `${name}.3`,
            `${name}.4`,
            `sb-access-token`,
            `sb-refresh-token`
          ];

          for (const variant of cookieVariations) {
            const variantCookie = cookies.get(variant);
            if (variantCookie?.value) {
              console.log(`🍪 Found session cookie: ${variant}`);
              return variantCookie.value;
            }
          }

          console.warn(`🚨 No session cookie found for: ${name}`);
          return undefined;
        },
        set(name: string, value: string, options: any) {
          const isDevelopment = import.meta.env.DEV || 
                               process.env.VERCEL === '1';
          
          const cookieOptions = {
            ...options,
            sameSite: 'lax' as const,
            httpOnly: false,
            secure: !isDevelopment,
            domain: isDevelopment ? undefined : '.vercel.app',
            path: '/'
          };
          
          // Set multiple cookie variants for maximum compatibility
          const variants = [
            name, 
            `${name}.0`, 
            `${name}.1`, 
            `sb-access-token`, 
            `sb-refresh-token`
          ];

          variants.forEach(variant => {
            try {
              console.log(`🍪 Setting cookie: ${variant}`);
              cookies.set(variant, value, cookieOptions);
            } catch (error) {
              console.error(`Failed to set cookie ${variant}:`, error);
            }
          });
        },
        remove(name: string, options: any) {
          const isDevelopment = import.meta.env.DEV || 
                               process.env.VERCEL === '1';
          
          const variants = [
            name, 
            `${name}.0`, 
            `${name}.1`, 
            `${name}.2`, 
            `${name}.3`, 
            `${name}.4`,
            `sb-access-token`,
            `sb-refresh-token`
          ];

          variants.forEach(variant => {
            try {
              console.log(`🗑️ Removing cookie: ${variant}`);
              cookies.delete(variant, {
                ...options,
                domain: isDevelopment ? undefined : '.vercel.app',
                path: '/'
              });
            } catch (error) {
              console.error(`Failed to remove cookie ${variant}:`, error);
            }
          });
        },
      },
    }
  )
}
