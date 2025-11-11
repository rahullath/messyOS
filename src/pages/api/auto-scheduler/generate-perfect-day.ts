/**
 * API Endpoint: Generate Perfect Day Plan
 * Creates an AI-optimized daily schedule considering all life contexts
 */

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { AutoSchedulerService } from '../../../lib/task-management/auto-scheduler';
import type { PerfectDayRequest } from '../../../lib/task-management/auto-scheduler';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await request.json();
    console.log('🎯 Perfect day generation request:', { userId: user.id, body });

    // Validate required fields
    if (!body.date) {
      return new Response(JSON.stringify({ 
        error: 'Date is required',
        details: 'Please provide a date for the perfect day plan'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Construct perfect day request
    const perfectDayRequest: PerfectDayRequest = {
      user_id: user.id,
      date: new Date(body.date),
      sleep_data: body.sleep_data ? {
        date: body.sleep_data.date,
        duration: body.sleep_data.duration,
        quality: body.sleep_data.quality,
        wake_up_time: body.sleep_data.wake_up_time,
        bed_time: body.sleep_data.bed_time
      } : undefined,
      energy_preferences: body.energy_preferences,
      gym_preferences: body.gym_preferences,
      meal_preferences: body.meal_preferences,
      task_priorities: body.task_priorities,
      external_constraints: body.external_constraints
    };

    // Validate date is not in the past (allow today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestDate = new Date(perfectDayRequest.date);
    requestDate.setHours(0, 0, 0, 0);
    
    if (requestDate < today) {
      return new Response(JSON.stringify({ 
        error: 'Invalid date',
        details: 'Cannot generate plans for past dates'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialize auto-scheduler service
    const autoScheduler = new AutoSchedulerService(supabase);

    // Generate perfect day plan
    console.log('🚀 Generating perfect day plan...');
    const optimizedPlan = await autoScheduler.generatePerfectDay(perfectDayRequest);

    console.log('✅ Perfect day plan generated successfully:', {
      userId: user.id,
      date: optimizedPlan.date.toISOString().split('T')[0],
      optimizationScore: optimizedPlan.optimization_score,
      tasksScheduled: optimizedPlan.task_blocks.length,
      gymScheduled: !!optimizedPlan.gym_session,
      mealsCost: optimizedPlan.meal_plan.total_cost_estimate
    });

    // Return the optimized plan
    return new Response(JSON.stringify({
      success: true,
      data: {
        plan: optimizedPlan,
        summary: {
          optimization_score: optimizedPlan.optimization_score,
          tasks_scheduled: optimizedPlan.task_blocks.length,
          gym_session_scheduled: !!optimizedPlan.gym_session,
          total_meal_cost: optimizedPlan.meal_plan.total_cost_estimate,
          free_time_blocks: optimizedPlan.free_time_blocks.length,
          potential_conflicts: optimizedPlan.potential_conflicts.length,
          backup_plans_available: optimizedPlan.backup_plans.length
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Perfect day generation failed:', error);
    
    // Handle specific error types
    if (error.message?.includes('No available slots')) {
      return new Response(JSON.stringify({
        error: 'Scheduling conflict',
        details: 'No available time slots found for the requested activities. Try adjusting your preferences or choosing a different date.',
        suggestions: [
          'Reduce the number of tasks to schedule',
          'Make gym session optional',
          'Increase schedule flexibility',
          'Choose a less busy day'
        ]
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (error.message?.includes('Database')) {
      return new Response(JSON.stringify({
        error: 'Database error',
        details: 'Failed to access scheduling data. Please try again.',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generic error response
    return new Response(JSON.stringify({
      error: 'Perfect day generation failed',
      details: error.message || 'An unexpected error occurred while generating your perfect day plan.',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get query parameters
    const searchParams = new URL(url).searchParams;
    const date = searchParams.get('date');
    
    if (!date) {
      return new Response(JSON.stringify({ 
        error: 'Date parameter is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch existing optimized plan for the date
    const { data: existingPlan, error } = await supabase
      .from('optimized_daily_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_date', date)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('❌ Failed to fetch existing plan:', error);
      return new Response(JSON.stringify({
        error: 'Database error',
        details: 'Failed to fetch existing plan'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!existingPlan) {
      return new Response(JSON.stringify({
        success: true,
        data: null,
        message: 'No existing plan found for this date'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Transform database format back to OptimizedDayPlan format
    const plan = {
      date: new Date(existingPlan.plan_date),
      user_id: existingPlan.user_id,
      wake_up_time: new Date(`${existingPlan.plan_date}T${existingPlan.wake_up_time}`),
      sleep_schedule: {
        target_bedtime: new Date(`${existingPlan.plan_date}T22:00:00`), // Default if not stored
        target_wake_time: new Date(`${existingPlan.plan_date}T${existingPlan.wake_up_time}`),
        recommended_duration: existingPlan.sleep_duration || 480
      },
      gym_session: existingPlan.gym_session,
      meal_plan: existingPlan.meal_plan,
      class_schedule: [], // Would need to fetch from calendar_events
      task_blocks: existingPlan.task_scheduling || [],
      travel_optimization: existingPlan.travel_optimization || [],
      free_time_blocks: [], // Would need to calculate
      optimization_score: Math.round((existingPlan.optimization_score || 0) * 100),
      birmingham_context: existingPlan.birmingham_context || {},
      ai_reasoning: existingPlan.ai_reasoning || [],
      potential_conflicts: existingPlan.potential_conflicts || [],
      backup_plans: existingPlan.backup_plans || []
    };

    return new Response(JSON.stringify({
      success: true,
      data: {
        plan,
        summary: {
          optimization_score: plan.optimization_score,
          tasks_scheduled: plan.task_blocks.length,
          gym_session_scheduled: !!plan.gym_session,
          total_meal_cost: plan.meal_plan?.total_cost_estimate || 0,
          free_time_blocks: plan.free_time_blocks.length,
          potential_conflicts: plan.potential_conflicts.length,
          backup_plans_available: plan.backup_plans.length
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ Failed to fetch perfect day plan:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch plan',
      details: error.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};