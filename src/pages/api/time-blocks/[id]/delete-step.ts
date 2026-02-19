import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';
import {
  deleteTimeBlock,
  getDailyPlan,
  getTimeBlock,
  getTimeBlocksByPlan,
  updateTimeBlock,
} from '../../../../lib/daily-plan/database';
import { reflowStepsBackward } from '../../../../lib/chains/step-customization';

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

type DeleteBody = {
  saveAsTemplate?: boolean;
};

export const POST: APIRoute = async ({ params, request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const blockId = params.id;
    if (!blockId) {
      return new Response(JSON.stringify({ error: 'Missing time block id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await request.json().catch(() => ({})) as DeleteBody;
    const saveAsTemplate = body.saveAsTemplate === true;

    const targetBlock = await getTimeBlock(supabase, blockId);
    if (!targetBlock) {
      return new Response(JSON.stringify({ error: 'Time block not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const plan = await getDailyPlan(supabase, targetBlock.planId);
    if (!plan || plan.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const targetMetadata = (targetBlock.metadata || {}) as Record<string, any>;
    const chainId = targetMetadata.chain_id || targetMetadata.role?.chain_id;
    const roleType = targetMetadata.role?.type;
    if (!chainId || (roleType !== 'chain-step' && roleType !== 'exit-gate')) {
      return new Response(JSON.stringify({ error: 'Selected block is not an editable chain step' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const chainBlocks = (await getTimeBlocksByPlan(supabase, plan.id))
      .filter((block) => {
        const metadata = (block.metadata || {}) as Record<string, any>;
        const blockChainId = metadata.chain_id || metadata.role?.chain_id;
        const type = metadata.role?.type;
        return blockChainId === chainId && (type === 'chain-step' || type === 'exit-gate');
      })
      .sort((a, b) => {
        if (a.startTime.getTime() === b.startTime.getTime()) return a.sequenceOrder - b.sequenceOrder;
        return a.startTime.getTime() - b.startTime.getTime();
      });

    if (chainBlocks.length <= 1) {
      return new Response(JSON.stringify({ error: 'Cannot delete the only remaining chain step' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const chainDeadline = new Date(Math.max(...chainBlocks.map((block) => block.endTime.getTime())));
    const remaining = chainBlocks.filter((block) => block.id !== targetBlock.id);

    await deleteTimeBlock(supabase, targetBlock.id);

    const reflowed = reflowStepsBackward(
      remaining.map((block) => ({
        id: block.id,
        durationMinutes: minutesBetween(block.startTime, block.endTime),
      })),
      chainDeadline
    );
    const reflowMap = new Map(reflowed.map((item) => [item.id, item]));

    for (let i = 0; i < remaining.length; i++) {
      const block = remaining[i];
      const timing = reflowMap.get(block.id);
      if (!timing) continue;
      await updateTimeBlock(supabase, block.id, {
        start_time: timing.start.toISOString(),
        end_time: timing.end.toISOString(),
        sequence_order: i + 1,
      });
    }

    if (saveAsTemplate) {
      const templateStepId = typeof targetMetadata.template_step_id === 'string'
        ? targetMetadata.template_step_id
        : null;

      if (templateStepId) {
        const { data: prefRow } = await supabase
          .from('user_preferences')
          .select('preferences')
          .eq('user_id', user.id)
          .maybeSingle();

        const preferences = prefRow?.preferences && typeof prefRow.preferences === 'object'
          ? (prefRow.preferences as Record<string, any>)
          : {};

        if (templateStepId.startsWith('custom:')) {
          const customSteps = Array.isArray(preferences.chain_custom_steps)
            ? preferences.chain_custom_steps.filter((item: any) => item?.id !== templateStepId)
            : [];
          await supabase.from('user_preferences').upsert({
            user_id: user.id,
            preferences: {
              ...preferences,
              chain_custom_steps: customSteps,
            } as any,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        } else {
          const overrides = preferences.chain_step_overrides && typeof preferences.chain_step_overrides === 'object'
            ? { ...preferences.chain_step_overrides }
            : {};
          overrides[templateStepId] = {
            ...(overrides[templateStepId] || {}),
            disabled: true,
            updated_at: new Date().toISOString(),
          };

          await supabase.from('user_preferences').upsert({
            user_id: user.id,
            preferences: {
              ...preferences,
              chain_step_overrides: overrides,
            } as any,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting chain step:', error);
    return new Response(JSON.stringify({
      error: 'Failed to delete chain step',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
