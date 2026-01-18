import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';
import { getDailyPlan } from '../../../../lib/daily-plan/database';
import { createPlanBuilderService } from '../../../../lib/daily-plan/plan-builder';

/**
 * POST /api/daily-plan/:id/degrade
 * 
 * Degrade a plan by removing optional tasks and recomputing buffers
 * 
 * Requirements: 4.1, 9.4
 */
export const POST: APIRoute = async ({ params, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id: planId } = params;

    if (!planId) {
      return new Response(JSON.stringify({ 
        error: 'Missing parameter',
        details: 'planId is required'
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

    // Check if plan is already degraded
    if (plan.status === 'degraded') {
      return new Response(JSON.stringify({ 
        error: 'Plan already degraded',
        details: 'This plan has already been degraded'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Degrade the plan
    // Requirement: 4.1 - Call degradation service
    const planBuilderService = createPlanBuilderService(supabase);
    const degradedPlan = await planBuilderService.degradePlan(planId);

    return new Response(JSON.stringify({ 
      plan: degradedPlan,
      message: 'Plan degraded successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error degrading plan:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Failed to degrade plan',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
