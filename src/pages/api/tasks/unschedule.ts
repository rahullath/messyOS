/**
 * API Endpoint: Unschedule Task
 * DELETE /api/tasks/unschedule
 * 
 * Removes a task's calendar event while keeping the task
 */

import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase/client';
import { TaskService } from '../../../lib/task-management/task-service';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    // Authenticate user
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    let requestData: { task_id: string };
    try {
      requestData = await request.json();
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate required fields
    if (!requestData.task_id) {
      return new Response(JSON.stringify({ error: 'task_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch the task to verify ownership
    const task = await TaskService.getTask(user.id, requestData.task_id);
    if (!task) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find and delete the calendar event linked to this task
    const { data: calendarEvents, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('external_id', requestData.task_id) // external_id links to task_id
      .eq('event_type', 'task');

    if (fetchError) {
      throw new Error(`Failed to find calendar events: ${fetchError.message}`);
    }

    if (calendarEvents && calendarEvents.length > 0) {
      // Delete all calendar events for this task
      const { error: deleteError } = await supabase
        .from('calendar_events')
        .delete()
        .eq('user_id', user.id)
        .eq('external_id', requestData.task_id)
        .eq('event_type', 'task');

      if (deleteError) {
        throw new Error(`Failed to delete calendar events: ${deleteError.message}`);
      }
    }

    // Update the task status back to pending since it's no longer scheduled
    await TaskService.updateTask(user.id, task.id, {
      status: 'pending'
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Task unscheduled successfully',
      removed_events: calendarEvents ? calendarEvents.length : 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error unscheduling task:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(JSON.stringify({
      error: errorMessage,
      success: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};