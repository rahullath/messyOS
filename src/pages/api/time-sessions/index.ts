import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import type { 
  TimeSession, 
  StartSessionRequest, 
  SessionsResponse, 
  SessionQueryParams,
  ValidationResult,
  ValidationError 
} from '../../../types/task-management';

// Validation functions
function validateStartSessionRequest(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.task_id || typeof data.task_id !== 'string') {
    errors.push({ field: 'task_id', message: 'Task ID is required and must be a string' });
  }

  if (data.estimated_duration && (typeof data.estimated_duration !== 'number' || data.estimated_duration <= 0)) {
    errors.push({ field: 'estimated_duration', message: 'Estimated duration must be a positive number' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

function buildSessionQuery(supabase: any, params: SessionQueryParams) {
  let query = supabase
    .from('time_sessions')
    .select('*', { count: 'exact' });

  if (params.task_id) {
    query = query.eq('task_id', params.task_id);
  }

  if (params.status) {
    query = query.eq('completion_status', params.status);
  }

  if (params.date_from) {
    query = query.gte('start_time', params.date_from);
  }

  if (params.date_to) {
    query = query.lte('start_time', params.date_to);
  }

  // Always order by start_time descending
  query = query.order('start_time', { ascending: false });

  // Pagination
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;
  
  query = query.range(offset, offset + limit - 1);

  return { query, page, limit };
}

// GET /api/time-sessions - List time sessions with filtering and pagination
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
    const params: SessionQueryParams = {
      task_id: url.searchParams.get('task_id') || undefined,
      status: url.searchParams.get('status') as any,
      date_from: url.searchParams.get('date_from') || undefined,
      date_to: url.searchParams.get('date_to') || undefined,
      page: parseInt(url.searchParams.get('page') || '1'),
      limit: parseInt(url.searchParams.get('limit') || '20')
    };

    const { query, page, limit } = buildSessionQuery(supabase, params);
    
    const { data: sessions, error, count } = await query.eq('user_id', user.id);

    if (error) {
      console.error('Error fetching time sessions:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch time sessions' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const response: SessionsResponse = {
      sessions: sessions || [],
      total: count || 0
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/time-sessions:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/time-sessions - Start a new time tracking session
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
    const validation = validateStartSessionRequest(body);

    if (!validation.isValid) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validation.errors 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify the task exists and belongs to the user
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id')
      .eq('id', body.task_id)
      .eq('user_id', user.id)
      .single();

    if (taskError) {
      if (taskError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Task not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error verifying task:', taskError);
      return new Response(JSON.stringify({ error: 'Failed to start session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if there's already an active session for this user
    const { data: activeSessions, error: activeError } = await supabase
      .from('time_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('completion_status', 'active');

    if (activeError) {
      console.error('Error checking active sessions:', activeError);
      return new Response(JSON.stringify({ error: 'Failed to start session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (activeSessions && activeSessions.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'You already have an active time tracking session. Please end it before starting a new one.' 
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sessionData = {
      user_id: user.id,
      task_id: body.task_id,
      start_time: new Date().toISOString(),
      estimated_duration: body.estimated_duration || null,
      completion_status: 'active' as const
    };

    const { data: timeSession, error } = await supabase
      .from('time_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) {
      console.error('Error creating time session:', error);
      return new Response(JSON.stringify({ error: 'Failed to start session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ session: timeSession }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/time-sessions:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};