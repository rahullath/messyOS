/**
 * API Endpoint: Schedule Task as Calendar Event
 * POST /api/tasks/schedule
 * 
 * Creates a calendar event for a task, finding an optimal time slot
 */

import type { APIRoute } from 'astro';
import { calendarService } from '../../../lib/calendar/calendar-service';
import { TaskService } from '../../../lib/task-management/task-service';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import type { ScheduleTaskRequest, ScheduledTask } from '../../../types/calendar';

export const POST: APIRoute = async ({ request, cookies }) => {
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
    let requestData: ScheduleTaskRequest;
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

    // Fetch the task to get its details
    const task = await TaskService.getTask(user.id, requestData.task_id, serverAuth.supabase);
    if (!task) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare the complete schedule request with task details
    const scheduleRequest: ScheduleTaskRequest = {
      task_id: task.id,
      user_id: user.id,
      title: requestData.title || task.title,
      description: requestData.description || task.description || `Work on: ${task.title}`,
      estimated_duration: requestData.estimated_duration || task.estimated_duration || 60, // Default to 1 hour
      deadline: requestData.deadline || task.deadline,
      energy_required: requestData.energy_required || task.energy_required || 'medium',
      priority: requestData.priority || task.priority || 'medium',
      flexibility: requestData.flexibility || 'flexible',
      importance: requestData.importance || 'medium',
      preferred_start_time: requestData.preferred_start_time,
      preferred_end_time: requestData.preferred_end_time,
      source_id: requestData.source_id
    };

    // Schedule the task using the calendar service
    const scheduledTask: ScheduledTask = await calendarService.scheduleTask(scheduleRequest, serverAuth.supabase);

    // Update the task to mark it as scheduled
    await TaskService.updateTask(user.id, task.id, {
      status: 'in_progress' // Mark as in progress since it's now scheduled
    }, serverAuth.supabase);

    return new Response(JSON.stringify({
      success: true,
      scheduled_task: scheduledTask,
      message: 'Task successfully scheduled as calendar event'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error scheduling task:', error);
    
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      // Handle specific error types
      if (error.message.includes('No available slots')) {
        statusCode = 409; // Conflict
      } else if (error.message.includes('duration is required')) {
        statusCode = 400; // Bad Request
      }
    }

    return new Response(JSON.stringify({
      error: errorMessage,
      success: false
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};