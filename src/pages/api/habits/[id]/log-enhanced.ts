// src/pages/api/habits/[id]/log-enhanced.ts - Enhanced with future dating
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';
import { updateHabitStreak } from '../../../../lib/habits/streaks';

export const POST: APIRoute = async ({ request, params, cookies }) => {
  const habitId = params.id as string;
  const supabase = createServerClient(cookies);

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
    
    const body = await request.json();
    const { 
      value = 1,     // 0=missed, 1=completed, 2=skipped, 3=partial
      date,          // ✅ Allow custom date
      notes,
      effort = 3,
      duration,      // Duration in minutes
      completion_time,
      energy_level = 3,
      mood = 3,
      location,
      weather,
      context = []
    } = body;

    // Use provided date or default to today
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Check if already logged for this date
    const { data: existingEntry } = await supabase
      .from('habit_entries')
      .select('id')
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .single();

    if (existingEntry) {
      // Update existing entry instead of failing
      const { data: updatedEntry, error: updateError } = await supabase
        .from('habit_entries')
        .update({
          value,
          notes: notes || null,
          effort,
          duration_minutes: duration || null,
          completion_time: completion_time || null,
          energy_level,
          mood,
          location: location || null,
          weather: weather || null,
          context_tags: Array.isArray(context) ? context : (typeof context === 'string' ? context.split(',').filter((c: string) => c.trim()) : []),
          logged_at: new Date().toISOString()
        })
        .eq('id', existingEntry.id)
        .select()
        .single();

      if (updateError) throw updateError;
      
      // Recalculate streak
      await updateHabitStreak(supabase, habitId, user.id);
      
      return new Response(JSON.stringify({
        ...updatedEntry,
        message: 'Entry updated successfully'
      }));
    }

    // Create new entry
    const { data: entry, error } = await supabase
      .from('habit_entries')
      .insert([{
        habit_id: habitId,
        user_id: user.id,
        value,
        notes: notes || null,
        effort,
        duration_minutes: duration || null,
        completion_time: completion_time || null,
        energy_level,
        mood,
        location: location || null,
        weather: weather || null,
        context_tags: Array.isArray(context) ? context : (typeof context === 'string' ? context.split(',').filter((c: string) => c.trim()) : []),
        logged_at: new Date().toISOString(),
        date: targetDate
      }])
      .select()
      .single();

    if (error) throw error;

    // Update streak count with skip logic
    await updateHabitStreak(supabase, habitId, user.id);

    return new Response(JSON.stringify({
      ...entry,
      message: 'Enhanced habit entry logged successfully'
    }));

  } catch (error: any) {
    // Handle auth errors
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please sign in to continue'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('API Error:', error);
    console.error('Enhanced logging error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
};
