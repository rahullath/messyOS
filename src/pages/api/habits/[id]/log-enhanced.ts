// src/pages/api/habits/[id]/log-enhanced.ts
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, params, cookies }) => {
  const supabase = createServerClient(cookies);
  
  const habitId = params.id as string;
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { 
      value = 1, 
      notes,
      effort,
      duration,
      completion_time,
      energy_level,
      mood,
      location,
      weather,
      context = []
    } = body;

    // Check if already logged today
    const todayIso = new Date().toISOString().split('T')[0];
    const { data: existingEntry } = await supabase
      .from('habit_entries')
      .select('id')
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .eq('date', todayIso)
      .single();

    if (existingEntry) {
      return new Response(JSON.stringify({ error: 'Already logged today' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse context array if it's a string
    let contextArray = context;
    if (typeof context === 'string') {
      contextArray = context.split(',').filter(c => c.trim().length > 0);
    }

    // Log the enhanced habit entry
    const { data: entry, error } = await supabase
      .from('habit_entries')
      .insert([{
        habit_id: habitId,
        user_id: user.id,
        value,
        notes,
        effort,
        duration,
        completion_time,
        energy_level,
        mood,
        location,
        weather,
        context: contextArray,
        logged_at: new Date().toISOString(),
        date: todayIso
      }])
      .select()
      .single();

    if (error) throw error;

    // Update streak count (simplified for now)
    await updateHabitStreak(supabase, habitId, user.id);

    return new Response(JSON.stringify({
      ...entry,
      message: 'Enhanced habit entry logged successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Enhanced logging error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function updateHabitStreak(supabase: any, habitId: string, userId: string) {
  // Simple streak update - count consecutive success days
  const { data: entries } = await supabase
    .from('habit_entries')
    .select('date, value')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(30);

  if (!entries) return;

  let currentStreak = 0;
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    const entry = entries.find((e: any) => e.date === dateStr);
    
    if (entry && entry.value === 1) {
      currentStreak++;
    } else if (entry && entry.value === 0) {
      break; // Failure breaks streak
    } else if (!entry) {
      if (currentStreak > 0) break; // No entry breaks active streak
    }
  }

  await supabase
    .from('habits')
    .update({ streak_count: currentStreak })
    .eq('id', habitId);
}
