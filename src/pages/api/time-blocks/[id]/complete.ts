import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';
import { getDailyPlan, getTimeBlock, updateTimeBlock } from '../../../../lib/daily-plan/database';

/**
 * POST /api/time-blocks/:id/complete
 *
 * Marks a time block as completed and records completion metadata.
 */
export const POST: APIRoute = async ({ params, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const blockId = params.id;
    if (!blockId) {
      return new Response(JSON.stringify({ error: 'Missing time block id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const block = await getTimeBlock(supabase, blockId);
    if (!block) {
      return new Response(JSON.stringify({ error: 'Time block not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const plan = await getDailyPlan(supabase, block.planId);
    if (!plan || plan.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updated = await updateTimeBlock(supabase, blockId, {
      status: 'completed',
      skip_reason: null,
      metadata: {
        ...(block.metadata || {}),
        completed_at: new Date().toISOString(),
        completed_by: user.id,
      } as any,
    });

    return new Response(JSON.stringify({ block: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error completing time block:', error);
    return new Response(JSON.stringify({
      error: 'Failed to complete time block',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
