import type { APIRoute } from 'astro';
import { runLifeOptimizer } from '../../../agentic-life-optimizer';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

// This endpoint can be triggered by a cron job (e.g., on Vercel or Render)
// to run the proactive life optimization agent periodically.
export const GET: APIRoute = async ({ request, cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    
    // Although this is a server-to-server call via cron,
    // we can still check for a user if needed, or run for all users.
    // For now, we assume a generic run.
    console.log("Life optimization cron job triggered.");

    const result = await runLifeOptimizer();

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Life optimization cycle completed successfully.",
      result,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    // Handle auth errors
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please sign in to continue'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('API Error:', error);
    console.error('Life optimization API error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'AI analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Tipe': 'application/json' }
    });
  }
};
