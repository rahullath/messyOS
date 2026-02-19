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

type EditBody = {
  name?: string;
  durationMinutes?: number;
  saveAsTemplate?: boolean;
  stepId?: string;
  planId?: string;
};

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function parseBody(input: unknown): EditBody {
  if (!input || typeof input !== 'object') return {};
  const body = input as Record<string, unknown>;
  return {
    name: typeof body.name === 'string' ? body.name.trim() : undefined,
    durationMinutes: typeof body.durationMinutes === 'number' ? Math.round(body.durationMinutes) : undefined,
    saveAsTemplate: body.saveAsTemplate !== false,
    stepId: typeof body.stepId === 'string' ? body.stepId : undefined,
    planId: typeof body.planId === 'string' ? body.planId : undefined,
  };
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

    const rawBody = await request.json().catch(() => null);
    const body = parseBody(rawBody);
    if (!body.name && typeof body.durationMinutes !== 'number') {
      return new Response(JSON.stringify({ error: 'At least one of name or durationMinutes is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (typeof body.durationMinutes === 'number' && (body.durationMinutes < 0 || body.durationMinutes > 240)) {
      return new Response(JSON.stringify({ error: 'durationMinutes must be between 0 and 240' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let targetBlock = await getTimeBlock(supabase, blockId);
    let plan = targetBlock ? await getDailyPlan(supabase, targetBlock.planId) : null;

    // Recover from stale block id by resolving current block via plan + step metadata.
    if (!targetBlock && body.planId && body.stepId) {
      const fallbackPlan = await getDailyPlan(supabase, body.planId);
      if (fallbackPlan && fallbackPlan.userId === user.id) {
        const fallbackBlocks = await getTimeBlocksByPlan(supabase, fallbackPlan.id);
        const recovered = fallbackBlocks.find((block) => {
          const metadata = (block.metadata || {}) as Record<string, any>;
          return String(metadata.step_id || '') === body.stepId;
        });
        if (recovered) {
          targetBlock = recovered;
          plan = fallbackPlan;
        }
      }
    }

    // Secondary recovery: current day's plan (plan id may be stale after regenerate).
    if (!targetBlock && body.stepId) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysPlan = await getDailyPlanByDateWithBlocks(supabase, user.id, today);

      if (todaysPlan?.timeBlocks && todaysPlan.timeBlocks.length > 0) {
        const recovered = todaysPlan.timeBlocks.find((block) => {
          const metadata = (block.metadata || {}) as Record<string, any>;
          return String(metadata.step_id || '') === body.stepId;
        });

        if (recovered) {
          targetBlock = recovered;
          plan = await getDailyPlan(supabase, recovered.planId);
        }
      }
    }

    if (!targetBlock) {
      return new Response(JSON.stringify({
        error: 'Time block not found',
        error_code: 'STALE_TIME_BLOCK_REFERENCE',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!plan || plan.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const targetMetadata = (targetBlock.metadata || {}) as Record<string, any>;
    const chainId = targetMetadata.chain_id || targetMetadata.role?.chain_id;
    const roleType = targetMetadata.role?.type;
    if (!chainId || (roleType !== 'chain-step' && roleType !== 'exit-gate')) {
      return new Response(JSON.stringify({ error: 'Selected block is not an editable chain step' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const allPlanBlocks = await getTimeBlocksByPlan(supabase, targetBlock.planId);
    const chainBlocks = allPlanBlocks
      .filter((block) => {
        const metadata = (block.metadata || {}) as Record<string, any>;
        const blockChainId = metadata.chain_id || metadata.role?.chain_id;
        const type = metadata.role?.type;
        return blockChainId === chainId && (type === 'chain-step' || type === 'exit-gate');
      })
      .sort((a, b) => {
        if (a.startTime.getTime() === b.startTime.getTime()) {
          return a.sequenceOrder - b.sequenceOrder;
        }
        return a.startTime.getTime() - b.startTime.getTime();
      });

    if (chainBlocks.length === 0) {
      return new Response(JSON.stringify({ error: 'No editable chain blocks found for this chain' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const chainDeadline = new Date(Math.max(...chainBlocks.map((block) => block.endTime.getTime())));
    const reflowInput = chainBlocks.map((block) => {
      const isTarget = block.id === targetBlock.id;
      const nextDuration = isTarget && typeof body.durationMinutes === 'number'
        ? body.durationMinutes
        : minutesBetween(block.startTime, block.endTime);
      return {
        id: block.id,
        durationMinutes: nextDuration,
      };
    });

    const reflowed = reflowStepsBackward(reflowInput, chainDeadline);
    const reflowMap = new Map(reflowed.map((row) => [row.id, row]));

    const updatedBlocks = [];
    for (const block of chainBlocks) {
      const timing = reflowMap.get(block.id);
      if (!timing) continue;
      const isTarget = block.id === targetBlock.id;
      const metadata = (block.metadata || {}) as Record<string, any>;
      const nextName = isTarget && body.name ? body.name : block.activityName;

      const updated = await updateTimeBlock(supabase, block.id, {
        activity_name: nextName,
        start_time: timing.start.toISOString(),
        end_time: timing.end.toISOString(),
        metadata: {
          ...metadata,
          custom_step_name: isTarget && body.name ? true : metadata.custom_step_name,
          custom_duration_minutes: timing.durationMinutes,
          custom_updated_at: new Date().toISOString(),
        } as any,
      });
      updatedBlocks.push(updated);
    }

    if (body.saveAsTemplate === true) {
      const templateStepId = typeof targetMetadata.template_step_id === 'string'
        ? targetMetadata.template_step_id
        : null;

      if (templateStepId) {
        const { data: prefRow, error: prefReadError } = await supabase
          .from('user_preferences')
          .select('preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!prefReadError) {
          const preferences = prefRow?.preferences && typeof prefRow.preferences === 'object'
            ? (prefRow.preferences as Record<string, any>)
            : {};
          const existingOverrides = preferences.chain_step_overrides && typeof preferences.chain_step_overrides === 'object'
            ? preferences.chain_step_overrides as Record<string, any>
            : {};

          existingOverrides[templateStepId] = {
            ...(existingOverrides[templateStepId] || {}),
            ...(body.name ? { name: body.name } : {}),
            ...(typeof body.durationMinutes === 'number' ? { duration_estimate: body.durationMinutes } : {}),
            updated_at: new Date().toISOString(),
          };

          await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              preferences: {
                ...preferences,
                chain_step_overrides: existingOverrides,
              } as any,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });
        }
      }
    }

    return new Response(JSON.stringify({ blocks: updatedBlocks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error editing chain step:', error);
    return new Response(JSON.stringify({
      error: 'Failed to edit chain step',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
