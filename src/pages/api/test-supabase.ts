import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
    
    return new Response(JSON.stringify({
      success: true,
      supabaseUrl: supabaseUrl ? 'present' : 'missing',
      supabaseKey: supabaseKey ? 'present' : 'missing',
      urlLength: supabaseUrl?.length || 0,
      keyLength: supabaseKey?.length || 0,
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};