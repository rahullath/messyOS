// src/pages/api/auth/config.ts - Provide Supabase config for client-side use
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return new Response(JSON.stringify({
      error: 'Missing Supabase public environment variables',
      hasUrl: Boolean(url),
      hasAnonKey: Boolean(key),
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    url,
    key
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    }
  });
};
