// src/lib/auth/serverAuth.ts
import type { AstroCookies } from 'astro';
// Since you're the only user, we can simplify server-side auth
export function getServerUser(cookies: AstroCookies) {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const projectRef = supabaseUrl.split('.')[0].split('//')[1];

  const authCookieNames = [
    `sb-${projectRef}-auth-token`,
    `sb-${projectRef}-auth-token.0`, 
    `sb-${projectRef}-auth-token.1`
  ];

  // Check for any auth cookie
  for (const cookieName of authCookieNames) {
    const cookie = cookies.get(cookieName);
    if (cookie) {
      try {
        const cookieData = JSON.parse(cookie.value);
        // Validate the user's email against a known email for simplified auth
        if (cookieData.user?.email === 'ketaminedevs@gmail.com') {
          return {
            id: '368deac7-8526-45eb-927a-6a373c95d8c6', // Your known user ID
            email: 'ketaminedevs@gmail.com'
          };
        }
      } catch (e) {
        // Cookie parsing failed, continue to next cookie
        continue;
      }
    }
  }

  return null;
}

export function requireAuth(cookies: AstroCookies) {
  const user = getServerUser(cookies);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
