// src/pages/api/auth/config.ts - Provide Supabase config for client-side use
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    url: import.meta.env.PUBLIC_SUPABASE_URL,
    key: import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    }
  });
};