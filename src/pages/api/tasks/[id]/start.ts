// src/pages/api/tasks/[id]/start.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ params, request, cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  try {
    
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

    // Check if task exists and belongs to user
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, status')
      .eq('id', taskId)
      .eq('user_id', user.id)
      .single();

    if (taskError || !task) {
      return new Response(JSON.stringify({
        error: 'Task not found'
      }), { status: 404 });
    }

    // Check if there's already an active session for this user
    const { data: activeSession } = await supabase
      .from('task_sessions')
      .select('id, task_id')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .single();

    if (activeSession) {
      return new Response(JSON.stringify({
        error: 'You already have an active task session. Please stop it first.',
        activeTaskId: activeSession.task_id
      }), { status: 400 });
    }

    // Get session type from request body (optional)
    const body = await request.json().catch(() => ({}));
    const sessionType = body.session_type || 'work';

    // Create new task session
    const { data: session, error: sessionError } = await supabase
      .from('task_sessions')
      .insert({
        user_id: user.id,
        task_id: taskId,
        started_at: new Date().toISOString(),
        session_type: sessionType,
        energy_level: body.energy_level || null,
        mood: body.mood || null,
        context: body.context || null
      })
      .select()
      .single();

    if (sessionError) {
      return new Response(JSON.stringify({
        error: 'Failed to start task session',
        details: sessionError.message
      }), { status: 500 });
    }

    // Update task status to in_progress if it's not already
    if (task.status === 'todo') {
      await supabase
        .from('tasks')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
    }

    return new Response(JSON.stringify({
      success: true,
      session,
      message: `Started working on "${task.title}"`
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