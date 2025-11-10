import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import type { 
  Task, 
  CreateTaskRequest, 
  TasksResponse, 
  TaskQueryParams,
  ValidationResult,
  ValidationError 
} from '../../../types/task-management';

// Validation functions
function validateCreateTaskRequest(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required and must be a non-empty string' });
  }

  if (data.title && data.title.length > 255) {
    errors.push({ field: 'title', message: 'Title must be 255 characters or less' });
  }

  if (!data.category || typeof data.category !== 'string' || data.category.trim().length === 0) {
    errors.push({ field: 'category', message: 'Category is required and must be a non-empty string' });
  }

  if (data.priority && !['low', 'medium', 'high', 'urgent'].includes(data.priority)) {
    errors.push({ field: 'priority', message: 'Priority must be one of: low, medium, high, urgent' });
  }

  if (data.complexity && !['simple', 'moderate', 'complex'].includes(data.complexity)) {
    errors.push({ field: 'complexity', message: 'Complexity must be one of: simple, moderate, complex' });
  }

  if (data.energy_required && !['low', 'medium', 'high'].includes(data.energy_required)) {
    errors.push({ field: 'energy_required', message: 'Energy required must be one of: low, medium, high' });
  }

  if (data.estimated_duration && (typeof data.estimated_duration !== 'number' || data.estimated_duration <= 0)) {
    errors.push({ field: 'estimated_duration', message: 'Estimated duration must be a positive number' });
  }

  if (data.deadline && isNaN(Date.parse(data.deadline))) {
    errors.push({ field: 'deadline', message: 'Deadline must be a valid ISO date string' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function buildTaskQuery(supabase: any, params: TaskQueryParams) {
  let query = supabase
    .from('tasks')
    .select('*', { count: 'exact' });

  if (params.status) {
    query = query.eq('status', params.status);
  }

  if (params.priority) {
    query = query.eq('priority', params.priority);
  }

  if (params.category) {
    query = query.eq('category', params.category);
  }

  if (params.deadline_before) {
    query = query.lt('deadline', params.deadline_before);
  }

  if (params.deadline_after) {
    query = query.gt('deadline', params.deadline_after);
  }

  if (params.parent_task_id) {
    query = query.eq('parent_task_id', params.parent_task_id);
  }

  // Sorting
  const sortBy = params.sort_by || 'created_at';
  const sortOrder = params.sort_order || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Pagination
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;
  
  query = query.range(offset, offset + limit - 1);

  return { query, page, limit };
}

// GET /api/tasks - List tasks with filtering and pagination
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const params: TaskQueryParams = {
      status: url.searchParams.get('status') as any,
      priority: url.searchParams.get('priority') as any,
      category: url.searchParams.get('category') || undefined,
      deadline_before: url.searchParams.get('deadline_before') || undefined,
      deadline_after: url.searchParams.get('deadline_after') || undefined,
      parent_task_id: url.searchParams.get('parent_task_id') || undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '20'),
      sort_by: url.searchParams.get('sort_by') as any || 'created_at',
      sort_order: url.searchParams.get('sort_order') as any || 'desc'
    };

    const { query, page, limit } = buildTaskQuery(supabase, params);
    
    const { data: tasks, error, count } = await query.eq('user_id', user.id);

    if (error) {
      console.error('Error fetching tasks:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch tasks' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response: TasksResponse = {
      tasks: tasks || [],
      total: count || 0,
      page,
      limit
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/tasks:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/tasks - Create a new task
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
    const validation = validateCreateTaskRequest(body);

    if (!validation.isValid) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validation.errors 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const taskData: CreateTaskRequest = {
      title: body.title.trim(),
      description: body.description?.trim() || null,
      category: body.category.trim(),
      priority: body.priority || 'medium',
      complexity: body.complexity || 'moderate',
      energy_required: body.energy_required || 'medium',
      estimated_duration: body.estimated_duration || null,
      deadline: body.deadline || null,
      parent_task_id: body.parent_task_id || null,
      created_from: body.created_from || 'manual'
    };

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return new Response(JSON.stringify({ error: 'Failed to create task' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ task }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/tasks:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
