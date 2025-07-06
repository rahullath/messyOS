// src/pages/api/tasks/[id]/index.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';

export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    const taskId = params.id;

    const { data: task, error } = await supabase
      .from('tasks')
      .select(`
        *,
        task_sessions(
          id, started_at, ended_at, duration, session_type, productivity_score, energy_level
        )
      `)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      return new Response(JSON.stringify({
        error: 'Task not found',
        details: error.message
      }), { status: 404 });
    }

    return new Response(JSON.stringify({
      success: true,
      task
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    const taskId = params.id;
    const body = await request.json();

    // Extract allowed fields for update
    const allowedFields = [
      'title', 'description', 'category', 'priority', 'status',
      'estimated_duration', 'due_date', 'scheduled_for',
      'energy_required', 'complexity', 'location', 'context',
      'tags', 'notes', 'completion_notes', 'satisfaction_score',
      'email_reminders'
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    // Set completion timestamp if status is being changed to completed
    if (body.status === 'completed' && !updateData.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    // Clear completion timestamp if status is being changed from completed
    if (body.status && body.status !== 'completed') {
      updateData.completed_at = null;
      updateData.completion_notes = null;
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({
        error: 'Failed to update task',
        details: error.message
      }), { status: 500 });
    }

    return new Response(JSON.stringify({
      success: true,
      task
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    const taskId = params.id;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) {
      return new Response(JSON.stringify({
        error: 'Failed to delete task',
        details: error.message
      }), { status: 500 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Task deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
};
