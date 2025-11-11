import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { AutoSchedulerService } from '../../../lib/intelligence/auto-scheduler-service';

// POST /api/tasks/auto-schedule - Automatically schedule a task using AI
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { task_id, approval_threshold = 0.7 } = body;

    if (!task_id) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the task details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use AI auto-scheduling service
    const result = await AutoSchedulerService.autoScheduleTask(
      user.id, 
      task, 
      approval_threshold
    );

    return new Response(JSON.stringify({
      scheduled: result.scheduled,
      reasoning: result.reasoning,
      slot: result.slot,
      task_id: task_id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/tasks/auto-schedule:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/tasks/batch-auto-schedule - Schedule multiple tasks intelligently
export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { task_ids, approval_threshold = 0.7, prioritize_by = 'ai_ranking' } = body;

    if (!task_ids || !Array.isArray(task_ids)) {
      return new Response(JSON.stringify({ error: 'Task IDs array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .in('id', task_ids)
      .eq('user_id', user.id);

    if (tasksError || !tasks) {
      return new Response(JSON.stringify({ error: 'Failed to fetch tasks' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use batch auto-scheduling
    const results = await AutoSchedulerService.batchAutoSchedule(
      user.id,
      tasks,
      { approval_threshold, prioritizeBy: prioritize_by }
    );

    // Count successes and failures
    const scheduled = results.filter(r => r.result.scheduled).length;
    const failed = results.length - scheduled;

    return new Response(JSON.stringify({
      total_tasks: results.length,
      scheduled_count: scheduled,
      failed_count: failed,
      results: results,
      summary: `Successfully scheduled ${scheduled}/${results.length} tasks`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/tasks/batch-auto-schedule:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};