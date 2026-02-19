import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { createServerClient } from '../../../../lib/supabase/server';
import {
  createTimeBlock,
  getDailyPlan,
  getTimeBlock,
  getTimeBlocksByPlan,
  updateTimeBlock,
} from '../../../../lib/daily-plan/database';
import { reflowStepsBackward } from '../../../../lib/chains/step-customization';

type AddStepBody = {
  name?: string;
  durationMinutes?: number;
  saveAsTemplate?: boolean;
};

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

export const POST: APIRoute = async ({ params, request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const afterBlockId = params.id;
    if (!afterBlockId) {
      return new Response(JSON.stringify({ error: 'Missing time block id' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await request.json().catch(() => ({})) as AddStepBody;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const durationMinutes = typeof body.durationMinutes === 'number' ? Math.round(body.durationMinutes) : 5;
    const saveAsTemplate = body.saveAsTemplate === true;

    if (!name) {
      return new Response(JSON.stringify({ error: 'name is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (durationMinutes < 0 || durationMinutes > 240) {
      return new Response(JSON.stringify({ error: 'durationMinutes must be between 0 and 240' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const afterBlock = await getTimeBlock(supabase, afterBlockId);
    if (!afterBlock) {
      return new Response(JSON.stringify({ error: 'Time block not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const plan = await getDailyPlan(supabase, afterBlock.planId);
    if (!plan || plan.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const afterMetadata = (afterBlock.metadata || {}) as Record<string, any>;
    const chainId = afterMetadata.chain_id || afterMetadata.role?.chain_id;
    if (!chainId) {
      return new Response(JSON.stringify({ error: 'Selected block is not part of a chain' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
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

    const insertIndex = chainBlocks.findIndex((block) => block.id === afterBlock.id);
    if (insertIndex < 0) {
      return new Response(JSON.stringify({ error: 'Could not resolve insert position' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const chainDeadline = new Date(Math.max(...chainBlocks.map((block) => block.endTime.getTime())));
    const newStepId = randomUUID();
    const newTemplateStepId = `custom:${newStepId}`;
    const metadata = {
      role: {
        type: 'chain-step',
        required: true,
        chain_id: chainId,
      },
      chain_id: chainId,
      step_id: newStepId,
      template_step_id: newTemplateStepId,
      anchor_id: afterMetadata.anchor_id || null,
      anchor_title: afterMetadata.anchor_title || null,
      anchor_start: afterMetadata.anchor_start || null,
      anchor_end: afterMetadata.anchor_end || null,
      anchor_location: afterMetadata.anchor_location || null,
      anchor_type: afterMetadata.anchor_type || 'other',
      custom_duration_minutes: durationMinutes,
      custom_step_name: true,
    } as any;

    const temporaryStart = new Date(chainDeadline);
    const temporaryEnd = new Date(chainDeadline.getTime() + 60_000);

    const created = await createTimeBlock(supabase, {
      plan_id: plan.id,
      start_time: temporaryStart.toISOString(),
      end_time: temporaryEnd.toISOString(),
      activity_type: 'routine',
      activity_name: name,
      activity_id: afterBlock.activityId,
      is_fixed: true,
      sequence_order: afterBlock.sequenceOrder + 1,
      status: 'pending',
      metadata,
    });

    const ordered = [...chainBlocks];
    ordered.splice(insertIndex + 1, 0, created);

    const reflowed = reflowStepsBackward(
      ordered.map((block) => ({
        id: block.id,
        durationMinutes: block.id === created.id ? durationMinutes : minutesBetween(block.startTime, block.endTime),
      })),
      chainDeadline
    );
    const reflowMap = new Map(reflowed.map((item) => [item.id, item]));

    for (let i = 0; i < ordered.length; i++) {
      const block = ordered[i];
      const timing = reflowMap.get(block.id);
      if (!timing) continue;
      await updateTimeBlock(supabase, block.id, {
        start_time: timing.start.toISOString(),
        end_time: timing.end.toISOString(),
        sequence_order: i + 1,
      });
    }

    if (saveAsTemplate) {
      const { data: prefRow } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      const preferences = prefRow?.preferences && typeof prefRow.preferences === 'object'
        ? (prefRow.preferences as Record<string, any>)
        : {};
      const customSteps = Array.isArray(preferences.chain_custom_steps)
        ? [...preferences.chain_custom_steps]
        : [];

      const afterTemplateStepId = typeof afterMetadata.template_step_id === 'string'
        ? afterMetadata.template_step_id
        : undefined;

      customSteps.push({
        id: newTemplateStepId,
        name,
        duration_estimate: durationMinutes,
        is_required: true,
        can_skip_when_late: false,
        insert_after_id: afterTemplateStepId,
        updated_at: new Date().toISOString(),
      });

      await supabase.from('user_preferences').upsert({
        user_id: user.id,
        preferences: {
          ...preferences,
          chain_custom_steps: customSteps,
        } as any,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }

    return new Response(JSON.stringify({ ok: true, created_id: created.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error adding chain step:', error);
    return new Response(JSON.stringify({
      error: 'Failed to add chain step',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
