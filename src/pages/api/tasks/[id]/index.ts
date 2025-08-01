// src/pages/api/tasks/[id]/index.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../../lib/auth/multi-user';

export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const supabase = serverAuth.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    const taskId = params.id;
    if (!taskId) {
      return new Response(JSON.stringify({
        error: 'Task ID is required'
      }), { status: 400 });
    }

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

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  try {
    const supabase = serverAuth.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    const taskId = params.id;
    if (!taskId) {
      return new Response(JSON.stringify({
        error: 'Task ID is required'
      }), { status: 400 });
    }

    const body = await request.json();
    const allowedFields = [
      'title', 'description', 'category', 'priority', 'status',
      'estimated_duration', 'due_date', 'scheduled_for', 'energy_required',
      'complexity', 'location', 'context', 'tags', 'email_reminders'
    ];

    // Filter only allowed fields
    const updateData = Object.keys(body)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = body[key];
        return obj;
      }, {} as any);

    if (Object.keys(updateData).length === 0) {
      return new Response(JSON.stringify({
        error: 'No valid fields to update'
      }), { status: 400 });
    }

    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();

    // If completing a task, set completed_at
    if (updateData.status === 'completed') {
      updateData.completed_at = new Date().toISOString();
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
    const supabase = serverAuth.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    const taskId = params.id;
    if (!taskId) {
      return new Response(JSON.stringify({
        error: 'Task ID is required'
      }), { status: 400 });
    }

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