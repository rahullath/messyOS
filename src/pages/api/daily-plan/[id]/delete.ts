import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';

export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    // Get authenticated user
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const planId = params.id;

    if (!planId) {
      return new Response(JSON.stringify({ error: 'Plan ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete the plan (cascade will delete time_blocks and exit_times)
    const { error } = await supabase
      .from('daily_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting plan:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete plan' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in delete plan endpoint:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
