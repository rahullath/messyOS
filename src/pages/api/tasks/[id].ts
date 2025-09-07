import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import type { 
  Task, 
  UpdateTaskRequest, 
  TaskResponse,
  ValidationResult,
  ValidationError 
} from '../../../types/task-management';

// Validation functions
function validateUpdateTaskRequest(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title must be a non-empty string' });
    } else if (data.title.length > 255) {
      errors.push({ field: 'title', message: 'Title must be 255 characters or less' });
    }
  }

  if (data.category !== undefined) {
    if (typeof data.category !== 'string' || data.category.trim().length === 0) {
      errors.push({ field: 'category', message: 'Category must be a non-empty string' });
    }
  }

  if (data.priority !== undefined && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
    errors.push({ field: 'priority', message: 'Priority must be one of: low, medium, high, urgent' });
  }

  if (data.status !== undefined && !['pending', 'in_progress', 'completed', 'cancelled', 'deferred'].includes(data.status)) {
    errors.push({ field: 'status', message: 'Status must be one of: pending, in_progress, completed, cancelled, deferred' });
  }

  if (data.complexity !== undefined && !['simple', 'moderate', 'complex'].includes(data.complexity)) {
    errors.push({ field: 'complexity', message: 'Complexity must be one of: simple, moderate, complex' });
  }

  if (data.energy_required !== undefined && !['low', 'medium', 'high'].includes(data.energy_required)) {
    errors.push({ field: 'energy_required', message: 'Energy required must be one of: low, medium, high' });
  }

  if (data.estimated_duration !== undefined && (typeof data.estimated_duration !== 'number' || data.estimated_duration <= 0)) {
    errors.push({ field: 'estimated_duration', message: 'Estimated duration must be a positive number' });
  }

  if (data.deadline !== undefined && data.deadline !== null && isNaN(Date.parse(data.deadline))) {
    errors.push({ field: 'deadline', message: 'Deadline must be a valid ISO date string or null' });
  }

  if (data.position !== undefined && (typeof data.position !== 'number' || data.position < 0)) {
    errors.push({ field: 'position', message: 'Position must be a non-negative number' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// GET /api/tasks/[id] - Get a specific task
export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const taskId = params.id;
    if (!taskId) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error fetching task:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch task' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response: TaskResponse = { task };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/tasks/[id]:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT /api/tasks/[id] - Update a specific task
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const taskId = params.id;
    if (!taskId) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const validation = validateUpdateTaskRequest(body);

    if (!validation.isValid) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validation.errors 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // First check if task exists and belongs to user
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error checking task existence:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to update task' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare update data
    const updateData: Partial<UpdateTaskRequest> = {};
    
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.description !== undefined) updateData.description = body.description?.trim() || null;
    if (body.category !== undefined) updateData.category = body.category.trim();
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.complexity !== undefined) updateData.complexity = body.complexity;
    if (body.energy_required !== undefined) updateData.energy_required = body.energy_required;
    if (body.estimated_duration !== undefined) updateData.estimated_duration = body.estimated_duration;
    if (body.deadline !== undefined) updateData.deadline = body.deadline;
    if (body.position !== undefined) updateData.position = body.position;

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return new Response(JSON.stringify({ error: 'Failed to update task' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response: TaskResponse = { task };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/tasks/[id]:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE /api/tasks/[id] - Delete a specific task
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const taskId = params.id;
    if (!taskId) {
      return new Response(JSON.stringify({ error: 'Task ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // First check if task exists and belongs to user
    const { data: existingTask, error: fetchError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error checking task existence:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to delete task' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting task:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete task' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ message: 'Task deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /api/tasks/[id]:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
