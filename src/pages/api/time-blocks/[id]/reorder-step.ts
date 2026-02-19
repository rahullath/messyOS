import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';
import {
  getDailyPlan,
  getDailyPlanByDateWithBlocks,
  getTimeBlock,
  getTimeBlocksByPlan,
  updateTimeBlock,
} from '../../../../lib/daily-plan/database';
import { reflowStepsBackward } from '../../../../lib/chains/step-customization';

type ReorderBody = {
  sourceStepId?: string;
  targetStepId?: string;
  planId?: string;
};

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

export const POST: APIRoute = async ({ params, request, cookies }) => {
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

    const body = await request.json().catch(() => ({})) as ReorderBody;
    const sourceStepId = typeof body.sourceStepId === 'string' ? body.sourceStepId : null;
    const targetStepId = typeof body.targetStepId === 'string' ? body.targetStepId : null;
    if (!sourceStepId || !targetStepId) {
      return new Response(JSON.stringify({ error: 'sourceStepId and targetStepId are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let sourceBlock = await getTimeBlock(supabase, blockId);
    let plan = sourceBlock ? await getDailyPlan(supabase, sourceBlock.planId) : null;

    if (!sourceBlock && body.planId) {
      const fallbackPlan = await getDailyPlan(supabase, body.planId);
      if (fallbackPlan && fallbackPlan.userId === user.id) {
        const blocks = await getTimeBlocksByPlan(supabase, fallbackPlan.id);
        sourceBlock = blocks.find((block) => {
          const metadata = (block.metadata || {}) as Record<string, any>;
          return String(metadata.step_id || '') === sourceStepId;
        }) || null;
        plan = fallbackPlan;
      }
    }

    if (!sourceBlock) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysPlan = await getDailyPlanByDateWithBlocks(supabase, user.id, today);
      const todaysBlocks = todaysPlan?.timeBlocks || [];
      sourceBlock = todaysBlocks.find((block) => {
        const metadata = (block.metadata || {}) as Record<string, any>;
        return String(metadata.step_id || '') === sourceStepId;
      }) || null;
      plan = sourceBlock ? await getDailyPlan(supabase, sourceBlock.planId) : null;
    }

    if (!sourceBlock || !plan || plan.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Time block not found', error_code: 'STALE_TIME_BLOCK_REFERENCE' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sourceMetadata = (sourceBlock.metadata || {}) as Record<string, any>;
    const chainId = sourceMetadata.chain_id || sourceMetadata.role?.chain_id;
    if (!chainId) {
      return new Response(JSON.stringify({ error: 'Source block is not part of a chain' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const chainBlocks = (await getTimeBlocksByPlan(supabase, plan.id))
      .filter((block) => {
        const metadata = (block.metadata || {}) as Record<string, any>;
        const blockChainId = metadata.chain_id || metadata.role?.chain_id;
        const roleType = metadata.role?.type;
        return blockChainId === chainId && (roleType === 'chain-step' || roleType === 'exit-gate');
      })
      .sort((a, b) => {
        if (a.startTime.getTime() === b.startTime.getTime()) return a.sequenceOrder - b.sequenceOrder;
        return a.startTime.getTime() - b.startTime.getTime();
      });

    const sourceIndex = chainBlocks.findIndex((block) => {
      const metadata = (block.metadata || {}) as Record<string, any>;
      return String(metadata.step_id || '') === sourceStepId;
    });
    const targetIndex = chainBlocks.findIndex((block) => {
      const metadata = (block.metadata || {}) as Record<string, any>;
      return String(metadata.step_id || '') === targetStepId;
    });

    if (sourceIndex < 0 || targetIndex < 0) {
      return new Response(JSON.stringify({ error: 'Could not resolve source or target step' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (sourceIndex === targetIndex) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reordered = [...chainBlocks];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const chainDeadline = new Date(Math.max(...chainBlocks.map((block) => block.endTime.getTime())));
    const reflowed = reflowStepsBackward(
      reordered.map((block) => ({
        id: block.id,
        durationMinutes: minutesBetween(block.startTime, block.endTime),
      })),
      chainDeadline
    );
    const reflowMap = new Map(reflowed.map((item) => [item.id, item]));

    for (let i = 0; i < reordered.length; i++) {
      const block = reordered[i];
      const timing = reflowMap.get(block.id);
      if (!timing) continue;
      await updateTimeBlock(supabase, block.id, {
        start_time: timing.start.toISOString(),
        end_time: timing.end.toISOString(),
        sequence_order: i + 1,
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error reordering chain steps:', error);
    return new Response(JSON.stringify({
      error: 'Failed to reorder chain steps',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
