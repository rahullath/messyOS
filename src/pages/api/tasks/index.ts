// src/pages/api/tasks/index.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');
    const priority = url.searchParams.get('priority');

    let query = supabase
      .from('tasks')
      .select(`
        *,
        task_sessions(
          id, started_at, ended_at, duration, session_type, productivity_score, energy_level
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);
    if (priority) query = query.eq('priority', priority);

    const { data: tasks, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch tasks',
        details: error.message 
      }), { status: 500 });
    }

    return new Response(JSON.stringify({
      success: true,
      tasks: tasks || []
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

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      priority = 'medium',
      estimated_duration,
      due_date,
      scheduled_for,
      energy_required = 'medium',
      complexity = 'moderate',
      location,
      context = [],
      tags = [],
      email_reminders = false
    } = body;

    if (!title || !category) {
      return new Response(JSON.stringify({
        error: 'Title and category are required'
      }), { status: 400 });
    }

    // Process tags if provided as string
    const processedTags = typeof tags === 'string' 
      ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : tags;

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title,
        description,
        category,
        priority,
        estimated_duration: estimated_duration ? parseInt(estimated_duration) : null,
        due_date: due_date || null,
        scheduled_for: scheduled_for || null,
        energy_required,
        complexity,
        location,
        context,
        tags: processedTags,
        email_reminders
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({
        error: 'Failed to create task',
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