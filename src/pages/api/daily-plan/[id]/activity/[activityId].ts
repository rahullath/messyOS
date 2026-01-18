import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../../lib/supabase/server';
import { getDailyPlan, getTimeBlock } from '../../../../../lib/daily-plan/database';
import { markBlockComplete, markBlockSkipped } from '../../../../../lib/daily-plan/sequencer';

/**
 * PATCH /api/daily-plan/:id/activity/:activityId
 * 
 * Update activity status (completed/skipped) and advance sequence
 * 
 * Requirements: 3.3, 3.4, 9.2, 9.3
 */
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id: planId, activityId } = params;

    if (!planId || !activityId) {
      return new Response(JSON.stringify({ 
        error: 'Missing parameters',
        details: 'planId and activityId are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify plan exists and belongs to user
    const plan = await getDailyPlan(supabase, planId);
    if (!plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (plan.userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify activity exists
    const activity = await getTimeBlock(supabase, activityId);
    if (!activity) {
      return new Response(JSON.stringify({ error: 'Activity not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (activity.planId !== planId) {
      return new Response(JSON.stringify({ 
        error: 'Activity does not belong to this plan' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate status
    if (!body.status || !['completed', 'skipped'].includes(body.status)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid status',
        details: 'status must be either "completed" or "skipped"'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update activity status
    let updatedActivity;
    if (body.status === 'completed') {
      // Requirement: 3.3 - Mark block complete and advance sequence
      updatedActivity = await markBlockComplete(supabase, activityId);
    } else {
      // Requirement: 3.4, 9.3 - Mark block skipped with optional reason
      const skipReason = body.skipReason || 'Skipped by user';
      updatedActivity = await markBlockSkipped(supabase, activityId, skipReason);
    }

    return new Response(JSON.stringify({ 
      activity: updatedActivity,
      message: `Activity ${body.status}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating activity:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to update activity',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
