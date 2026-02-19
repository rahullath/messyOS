import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { getDailyPlanByDateWithBlocks } from '../../../lib/daily-plan/database';
import type { DailyPlan, TimeBlock } from '../../../types/daily-plan';
import type { Anchor } from '../../../lib/anchors/types';
import type { ChainStepInstance, CommitmentEnvelope, ExecutionChain } from '../../../lib/chains/types';

function deriveChainStatus(steps: ChainStepInstance[]): ExecutionChain['status'] {
  if (steps.length > 0 && steps.every((step) => step.status === 'completed')) {
    return 'completed';
  }

  if (steps.some((step) => step.status === 'in-progress')) {
    return 'in-progress';
  }

  return 'pending';
}

function buildSyntheticEnvelope(
  chainId: string,
  anchorId: string,
  anchor: Anchor,
  chainCompletionDeadline: Date,
  chainStart: Date
): CommitmentEnvelope {
  const travelDurationMinutes = 30;
  const recoveryDurationMinutes = 10;

  const prep: ChainStepInstance = {
    step_id: `${chainId}-prep`,
    chain_id: chainId,
    name: 'Preparation',
    start_time: chainStart,
    end_time: chainCompletionDeadline,
    duration: Math.max(1, Math.round((chainCompletionDeadline.getTime() - chainStart.getTime()) / 60000)),
    is_required: true,
    can_skip_when_late: false,
    status: 'pending',
    role: 'chain-step',
  };

  const travelThereStart = chainCompletionDeadline;
  const travelThereEnd = new Date(travelThereStart.getTime() + travelDurationMinutes * 60000);

  const travelThere: ChainStepInstance = {
    step_id: `${chainId}-travel-there`,
    chain_id: chainId,
    name: `Travel to ${anchor.title}`,
    start_time: travelThereStart,
    end_time: travelThereEnd,
    duration: travelDurationMinutes,
    is_required: true,
    can_skip_when_late: false,
    status: 'pending',
    role: 'chain-step',
  };

  const anchorStep: ChainStepInstance = {
    step_id: `${chainId}-anchor`,
    chain_id: chainId,
    name: anchor.title,
    start_time: anchor.start,
    end_time: anchor.end,
    duration: Math.max(1, Math.round((anchor.end.getTime() - anchor.start.getTime()) / 60000)),
    is_required: true,
    can_skip_when_late: false,
    status: 'pending',
    role: 'anchor',
  };

  const travelBackStart = anchor.end;
  const travelBackEnd = new Date(travelBackStart.getTime() + travelDurationMinutes * 60000);

  const travelBack: ChainStepInstance = {
    step_id: `${chainId}-travel-back`,
    chain_id: chainId,
    name: `Travel from ${anchor.title}`,
    start_time: travelBackStart,
    end_time: travelBackEnd,
    duration: travelDurationMinutes,
    is_required: true,
    can_skip_when_late: false,
    status: 'pending',
    role: 'chain-step',
  };

  const recoveryStart = travelBackEnd;
  const recoveryEnd = new Date(recoveryStart.getTime() + recoveryDurationMinutes * 60000);

  const recovery: ChainStepInstance = {
    step_id: `${chainId}-recovery`,
    chain_id: chainId,
    name: 'Recovery',
    start_time: recoveryStart,
    end_time: recoveryEnd,
    duration: recoveryDurationMinutes,
    is_required: true,
    can_skip_when_late: false,
    status: 'pending',
    role: 'recovery',
  };

  return {
    envelope_id: `${chainId}-synthetic-envelope`,
    prep,
    travel_there: travelThere,
    anchor: anchorStep,
    travel_back: travelBack,
    recovery,
  };
}

function reconstructChainsFromTimeBlocks(plan: DailyPlan): ExecutionChain[] {
  if (!plan.timeBlocks || plan.timeBlocks.length === 0) {
    return [];
  }

  const chainBlocks = plan.timeBlocks.filter((block) => {
    const metadata = (block.metadata || {}) as Record<string, any>;
    const roleType = metadata.role?.type;
    const chainId = metadata.chain_id || metadata.role?.chain_id;

    return Boolean(metadata.chain_view_only) &&
      typeof chainId === 'string' &&
      (roleType === 'chain-step' || roleType === 'exit-gate');
  });

  if (chainBlocks.length === 0) {
    return [];
  }

  const grouped = new Map<string, TimeBlock[]>();
  for (const block of chainBlocks) {
    const metadata = (block.metadata || {}) as Record<string, any>;
    const chainId = String(metadata.chain_id || metadata.role?.chain_id);

    if (!grouped.has(chainId)) {
      grouped.set(chainId, []);
    }

    grouped.get(chainId)!.push(block);
  }

  const chains: ExecutionChain[] = [];

  for (const [chainId, blocks] of grouped.entries()) {
    const sortedBlocks = [...blocks].sort((a, b) => {
      if (a.startTime.getTime() === b.startTime.getTime()) {
        return a.sequenceOrder - b.sequenceOrder;
      }
      return a.startTime.getTime() - b.startTime.getTime();
    });

    const firstMetadata = (sortedBlocks[0].metadata || {}) as Record<string, any>;
    const anchorId = String(firstMetadata.anchor_id || sortedBlocks[0].activityId || `anchor-${chainId}`);

    const anchorTimeBlock = plan.timeBlocks.find((block) => (
      block.activityType === 'commitment' &&
      (block.activityId === anchorId || ((block.metadata || {}) as Record<string, any>).anchor_id === anchorId)
    ));

    const fallbackAnchorStart = new Date(sortedBlocks[sortedBlocks.length - 1].endTime.getTime() + 75 * 60000);
    const fallbackAnchorEnd = new Date(fallbackAnchorStart.getTime() + 60 * 60000);

    const anchor: Anchor = {
      id: anchorId,
      title: anchorTimeBlock?.activityName || 'Planned commitment',
      start: anchorTimeBlock?.startTime || fallbackAnchorStart,
      end: anchorTimeBlock?.endTime || fallbackAnchorEnd,
      location: undefined,
      type: 'other',
      must_attend: true,
      calendar_event_id: anchorId,
    };

    const steps: ChainStepInstance[] = sortedBlocks.map((block) => {
      const metadata = (block.metadata || {}) as Record<string, any>;
      const roleType = metadata.role?.type === 'exit-gate' ? 'exit-gate' : 'chain-step';

      return {
        step_id: String(metadata.step_id || block.id),
        chain_id: chainId,
        name: block.activityName,
        start_time: block.startTime,
        end_time: block.endTime,
        duration: Math.max(1, Math.round((block.endTime.getTime() - block.startTime.getTime()) / 60000)),
        is_required: Boolean(metadata.role?.required ?? true),
        can_skip_when_late: false,
        status: block.status === 'completed' ? 'completed' : block.status === 'skipped' ? 'skipped' : 'pending',
        role: roleType,
        skip_reason: block.skipReason,
        metadata: {
          ...metadata,
          time_block_id: block.id,
        },
      };
    });

    const chainCompletionDeadline = new Date(
      Math.max(...steps.map((step) => step.end_time.getTime()))
    );

    const chainStart = new Date(
      Math.min(...steps.map((step) => step.start_time.getTime()))
    );

    chains.push({
      chain_id: chainId,
      anchor_id: anchorId,
      anchor,
      chain_completion_deadline: chainCompletionDeadline,
      steps,
      commitment_envelope: buildSyntheticEnvelope(
        chainId,
        anchorId,
        anchor,
        chainCompletionDeadline,
        chainStart
      ),
      status: deriveChainStatus(steps),
      metadata: {
        reconstructed_from_time_blocks: true,
      },
    });
  }

  return chains.sort((a, b) => a.anchor.start.getTime() - b.anchor.start.getTime());
}

function hydratePlanWithChains(plan: DailyPlan): DailyPlan {
  if (plan.chains && plan.chains.length > 0) {
    return plan;
  }

  const chains = reconstructChainsFromTimeBlocks(plan);
  if (chains.length === 0) {
    return plan;
  }

  return {
    ...plan,
    chains,
  };
}

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

    const hydratedPlan = hydratePlanWithChains(plan);

    return new Response(JSON.stringify({ plan: hydratedPlan }), {
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
