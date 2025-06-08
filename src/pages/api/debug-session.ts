import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies }) => {
  const allCookies: Record<string, string> = {};
  
  // Check all cookie names that might exist
  const possibleNames = [
    'sb-mdhtpjpwwbuepsytgrva-auth-token',
    'sb-mdhtpjpwwbuepsytgrva-auth-token.0',
    'sb-mdhtpjpwwbuepsytgrva-auth-token.1',
    'supabase-auth-token',
    'supabase.auth.token'
  ];
  
  for (const name of possibleNames) {
    const cookie = cookies.get(name);
    if (cookie) {
      allCookies[name] = cookie.value;
    }
  }
  
  return new Response(JSON.stringify({
    cookies: allCookies,
    cookieCount: Object.keys(allCookies).length,
    message: Object.keys(allCookies).length === 0 ? 'No auth cookies found' : 'Found auth cookies'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
