// src/pages/api/tasks/stop-session.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const supabase = createServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Authentication required' 
      }), { status: 401 });
    }

    // Find active session
    const { data: activeSession, error: sessionError } = await supabase
      .from('task_sessions')
      .select('*, tasks(title)')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .single();

    if (sessionError || !activeSession) {
      return new Response(JSON.stringify({
        error: 'No active task session found'
      }), { status: 404 });
    }

    // Get optional data from request body
    const body = await request.json().catch(() => ({}));
    const endTime = new Date().toISOString();
    const startTime = new Date(activeSession.started_at);
    const duration = Math.floor((new Date(endTime).getTime() - startTime.getTime()) / 1000); // Duration in seconds

    // Update session with end time and duration
    const updateData = {
      ended_at: endTime,
      duration: duration,
      productivity_score: body.productivity_score || null,
      energy_level: body.energy_level || activeSession.energy_level,
      mood: body.mood || activeSession.mood,
      notes: body.notes || null,
      interruptions: body.interruptions || 0,
      focus_rating: body.focus_rating || null
    };

    const { data: updatedSession, error: updateError } = await supabase
      .from('task_sessions')
      .update(updateData)
      .eq('id', activeSession.id)
      .select()
      .single();

    if (updateError) {
      return new Response(JSON.stringify({
        error: 'Failed to stop task session',
        details: updateError.message
      }), { status: 500 });
    }

    // Format duration for display
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;
    
    let durationText = '';
    if (hours > 0) durationText += `${hours}h `;
    if (minutes > 0) durationText += `${minutes}m `;
    if (seconds > 0 || durationText === '') durationText += `${seconds}s`;

    return new Response(JSON.stringify({
      success: true,
      session: updatedSession,
      duration: {
        seconds: duration,
        formatted: durationText.trim()
      },
      message: `Stopped working on "${activeSession.tasks?.title}". Duration: ${durationText.trim()}`
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