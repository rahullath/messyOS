import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';
import { getDailyPlan, getTimeBlock, updateTimeBlock } from '../../../../lib/daily-plan/database';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function containsForbiddenUserKey(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsForbiddenUserKey);
  }

  if (isObject(value)) {
    for (const [key, nestedValue] of Object.entries(value)) {
      if (key === 'user_id' || key === 'userId') {
        return true;
      }
      if (containsForbiddenUserKey(nestedValue)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * POST /api/time-blocks/:id/update-meta
 *
 * Safely merges metadata into a time block after auth + ownership checks.
 */
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

    const body = await request.json().catch(() => null);
    if (!body || !isObject(body.metadata)) {
      return new Response(JSON.stringify({ error: 'metadata object is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (containsForbiddenUserKey(body.metadata)) {
      return new Response(JSON.stringify({ error: 'user identity cannot be provided in metadata' }), {
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

    const existingMetadata = isObject(block.metadata) ? block.metadata : {};
    const incomingMetadata = body.metadata as Record<string, unknown>;

    const existingRole = isObject(existingMetadata.role) ? existingMetadata.role : {};
    const incomingRole = isObject(incomingMetadata.role) ? incomingMetadata.role : {};

    const mergedMetadata = {
      ...existingMetadata,
      ...incomingMetadata,
      role: {
        ...existingRole,
        ...incomingRole,
      },
    };

    const updated = await updateTimeBlock(supabase, blockId, {
      metadata: mergedMetadata as any,
    });

    return new Response(JSON.stringify({ block: updated }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating time block metadata:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update time block metadata',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
