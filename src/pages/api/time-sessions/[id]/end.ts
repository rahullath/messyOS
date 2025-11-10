import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';
import type { 
  TimeSession, 
  EndSessionRequest,
  ValidationResult,
  ValidationError 
} from '../../../../types/task-management';

// Validation functions
function validateEndSessionRequest(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.completion_status || !['completed', 'partial', 'abandoned'].includes(data.completion_status)) {
    errors.push({ 
      field: 'completion_status', 
      message: 'Completion status is required and must be one of: completed, partial, abandoned' 
    });
  }

  if (data.productivity_rating !== undefined) {
    if (typeof data.productivity_rating !== 'number' || data.productivity_rating < 1 || data.productivity_rating > 10) {
      errors.push({ 
        field: 'productivity_rating', 
        message: 'Productivity rating must be a number between 1 and 10' 
      });
    }
  }

  if (data.difficulty_rating !== undefined) {
    if (typeof data.difficulty_rating !== 'number' || data.difficulty_rating < 1 || data.difficulty_rating > 10) {
      errors.push({ 
        field: 'difficulty_rating', 
        message: 'Difficulty rating must be a number between 1 and 10' 
      });
    }
  }

  if (data.energy_level !== undefined) {
    if (typeof data.energy_level !== 'number' || data.energy_level < 1 || data.energy_level > 10) {
      errors.push({ 
        field: 'energy_level', 
        message: 'Energy level must be a number between 1 and 10' 
      });
    }
  }

  if (data.distractions !== undefined) {
    if (!Array.isArray(data.distractions) || !data.distractions.every(d => typeof d === 'string')) {
      errors.push({ 
        field: 'distractions', 
        message: 'Distractions must be an array of strings' 
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// PUT /api/time-sessions/[id]/end - End a time tracking session
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

    const sessionId = params.id;
    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Session ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const validation = validateEndSessionRequest(body);

    if (!validation.isValid) {
      return new Response(JSON.stringify({ 
        error: 'Validation failed', 
        details: validation.errors 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // First check if session exists, belongs to user, and is active
    const { data: existingSession, error: fetchError } = await supabase
      .from('time_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Time session not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.error('Error checking session existence:', fetchError);
      return new Response(JSON.stringify({ error: 'Failed to end session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (existingSession.completion_status !== 'active') {
      return new Response(JSON.stringify({ 
        error: 'Session is not active and cannot be ended' 
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare update data
    const endTime = new Date().toISOString();
    const updateData = {
      end_time: endTime,
      completion_status: body.completion_status,
      productivity_rating: body.productivity_rating || null,
      difficulty_rating: body.difficulty_rating || null,
      energy_level: body.energy_level || null,
      distractions: body.distractions || null,
      notes: body.notes?.trim() || null
    };

    const { data: timeSession, error } = await supabase
      .from('time_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error ending time session:', error);
      return new Response(JSON.stringify({ error: 'Failed to end session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If session was completed, update the task's actual duration
    if (body.completion_status === 'completed' && timeSession.actual_duration) {
      const { error: taskUpdateError } = await supabase
        .from('tasks')
        .update({ 
          actual_duration: timeSession.actual_duration,
          status: 'completed'
        })
        .eq('id', timeSession.task_id)
        .eq('user_id', user.id);

      if (taskUpdateError) {
        console.error('Error updating task duration:', taskUpdateError);
        // Don't fail the request, just log the error
      }
    }

    return new Response(JSON.stringify({ session: timeSession }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error in PUT /api/time-sessions/[id]/end:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};