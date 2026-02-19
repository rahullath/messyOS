import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';
import { getDailyPlan, getTimeBlock, updateTimeBlock } from '../../../../lib/daily-plan/database';

/**
 * POST /api/time-blocks/:id/uncomplete
 *
 * Clears completion state for a time block and removes completion metadata.
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

    const existingMetadata = { ...(block.metadata || {}) } as Record<string, unknown>;
    delete existingMetadata.completed_at;
    delete existingMetadata.completed_by;

    const updated = await updateTimeBlock(supabase, blockId, {
      status: 'pending',
      metadata: existingMetadata as any,
    });

    return new Response(JSON.stringify({ block: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uncompleting time block:', error);
    return new Response(JSON.stringify({
      error: 'Failed to uncomplete time block',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
