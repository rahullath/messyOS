// src/pages/api/tasks/index.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/multi-user';

export const GET: APIRoute = async ({ url, cookies }) => {
  try {
    const supabase = serverAuth.supabase;
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
    // Get authenticated user
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    const body = await request.json();
    console.log('Received task data:', body);

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

    if (!title) {
      return new Response(JSON.stringify({
        error: 'Title is required'
      }), { status: 400 });
    }

    if (!category) {
      return new Response(JSON.stringify({
        error: 'Category is required'
      }), { status: 400 });
    }

    // Process tags if provided as string
    const processedTags = typeof tags === 'string' 
      ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      : Array.isArray(tags) ? tags : [];

    // Process context
    const processedContext = Array.isArray(context) ? context : [];

    // Build insert data with only valid fields
    const insertData = {
      user_id: user.id,
      title: title.trim(),
      category: category.trim(),
      priority,
      status: 'todo'
    };

    // Add optional fields only if they have values
    if (description && description.trim()) {
      insertData.description = description.trim();
    }

    if (estimated_duration && !isNaN(parseInt(estimated_duration))) {
      insertData.estimated_duration = parseInt(estimated_duration);
    }

    if (due_date) {
      insertData.due_date = due_date;
    }

    if (scheduled_for) {
      insertData.scheduled_for = scheduled_for;
    }

    if (energy_required) {
      insertData.energy_required = energy_required;
    }

    if (complexity) {
      insertData.complexity = complexity;
    }

    if (location && location.trim()) {
      insertData.location = location.trim();
    }

    if (processedContext.length > 0) {
      insertData.context = processedContext;
    }

    if (processedTags.length > 0) {
      insertData.tags = processedTags;
    }

    if (email_reminders !== undefined) {
      insertData.email_reminders = email_reminders;
    }

    console.log('Insert data:', insertData);

    const { data: task, error } = await supabase
      .from('tasks')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to create task',
        details: error.message,
        code: error.code
      }), { status: 500 });
    }

    console.log('Created task:', task);

    return new Response(JSON.stringify({
      success: true,
      task
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
};