// src/pages/api/tasks/[id]/timer.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../../lib/auth/multi-user';

export const POST: APIRoute = async ({ params, request, cookies }) => {
  try {
    const supabase = serverAuth.supabase;
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    const taskId = params.id;
    const { action, ...sessionData } = await request.json();

    if (action === 'start') {
      // Check if there's already an active session for this user
      const { data: activeSession } = await supabase
        .from('task_sessions')
        .select('id, task_id')
        .eq('user_id', user.id)
        .is('ended_at', null)
        .single();

      if (activeSession) {
        return new Response(JSON.stringify({
          error: 'Another task session is already active',
          activeTaskId: activeSession.task_id
        }), { status: 400 });
      }

      // Start new session
      const { data: session, error } = await supabase
        .from('task_sessions')
        .insert({
          task_id: taskId,
          user_id: user.id,
          started_at: new Date().toISOString(),
          session_type: sessionData.session_type || 'focus'
        })
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({
          error: 'Failed to start timer',
          details: error.message
        }), { status: 500 });
      }

      // Update task status to in_progress if it's not already
      await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .eq('id', taskId)
        .eq('user_id', user.id)
        .eq('status', 'todo'); // Only update if it's currently todo

      return new Response(JSON.stringify({
        success: true,
        session
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else if (action === 'stop') {
      // Find and stop the active session
      const { data: activeSession } = await supabase
        .from('task_sessions')
        .select('id, started_at')
        .eq('task_id', taskId)
        .eq('user_id', user.id)
        .is('ended_at', null)
        .single();

      if (!activeSession) {
        return new Response(JSON.stringify({
          error: 'No active session found for this task'
        }), { status: 400 });
      }

      const endTime = new Date().toISOString();
      const duration = Math.floor((new Date(endTime).getTime() - new Date(activeSession.started_at).getTime()) / 1000);

      const { data: session, error } = await supabase
        .from('task_sessions')
        .update({
          ended_at: endTime,
          duration,
          productivity_score: sessionData.productivity_score,
          energy_level: sessionData.energy_level,
          notes: sessionData.notes,
          interruptions: sessionData.interruptions || 0
        })
        .eq('id', activeSession.id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({
          error: 'Failed to stop timer',
          details: error.message
        }), { status: 500 });
      }

      // Update task's actual duration
      const { data: task } = await supabase
        .from('tasks')
        .select('actual_duration')
        .eq('id', taskId)
        .single();

      const newActualDuration = (task?.actual_duration || 0) + Math.floor(duration / 60); // Convert to minutes

      await supabase
        .from('tasks')
        .update({ 
          actual_duration: newActualDuration,
          status: sessionData.task_completed ? 'completed' : 'todo',
          completed_at: sessionData.task_completed ? endTime : null,
          completion_notes: sessionData.completion_notes || null,
          satisfaction_score: sessionData.satisfaction_score || null
        })
        .eq('id', taskId)
        .eq('user_id', user.id);

      return new Response(JSON.stringify({
        success: true,
        session,
        duration: Math.floor(duration / 60) // Return duration in minutes
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else {
      return new Response(JSON.stringify({
        error: 'Invalid action. Use "start" or "stop"'
      }), { status: 400 });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500 });
  }
};

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

    // Get active session for this task
    const { data: activeSession } = await supabase
      .from('task_sessions')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .is('ended_at', null)
      .single();

    // Get all sessions for this task
    const { data: allSessions, error } = await supabase
      .from('task_sessions')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    if (error) {
      return new Response(JSON.stringify({
        error: 'Failed to fetch timer data',
        details: error.message
      }), { status: 500 });
    }

    const totalTime = allSessions?.reduce((sum, session) => sum + (session.duration || 0), 0) || 0;
    const avgProductivity = allSessions?.length > 0 
      ? allSessions.reduce((sum, s) => sum + (s.productivity_score || 0), 0) / allSessions.length 
      : 0;

    return new Response(JSON.stringify({
      success: true,
      activeSession,
      allSessions,
      stats: {
        totalTime: Math.floor(totalTime / 60), // in minutes
        sessionCount: allSessions?.length || 0,
        avgProductivity: Math.round(avgProductivity * 10) / 10
      }
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