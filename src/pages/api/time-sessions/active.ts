import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

// GET /api/time-sessions/active - Get all active sessions for the current user
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: sessions, error } = await supabase
      .from('time_sessions')
      .select(`
        *,
        tasks (
          id,
          title,
          category,
          priority
        )
      `)
      .eq('user_id', user.id)
      .eq('completion_status', 'active')
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error fetching active sessions:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch active sessions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ sessions: sessions || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/time-sessions/active:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};