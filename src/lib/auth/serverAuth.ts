// src/lib/auth/serverAuth.ts
import type { AstroCookies } from 'astro';

// Since you're the only user, we can simplify server-side auth
export function getServerUser(cookies: AstroCookies) {
  const authCookieNames = [
    'sb-mdhtpjpwwbuepsytgrva-auth-token',
    'sb-mdhtpjpwwbuepsytgrva-auth-token.0', 
    'sb-mdhtpjpwwbuepsytgrva-auth-token.1'
  ];

  // Check for any auth cookie
  for (const cookieName of authCookieNames) {
    const cookie = cookies.get(cookieName);
    if (cookie) {
      try {
        const cookieData = JSON.parse(cookie.value);
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