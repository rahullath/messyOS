import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { getDailyPlanByDateWithBlocks } from '../../../lib/daily-plan/database';

/**
 * GET /api/daily-plan/today
 * 
 * Fetch today's plan for the authenticated user
 * 
 * Requirements: 8.2, 9.2
 */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get today's date (start of day in local timezone)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch today's plan with all time blocks and exit times
    const plan = await getDailyPlanByDateWithBlocks(supabase, user.id, today);

    // Return null if no plan exists (not an error)
    if (!plan) {
      return new Response(JSON.stringify({ plan: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ plan }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching today\'s plan:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
