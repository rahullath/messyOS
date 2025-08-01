// src/pages/api/habits/[id]/log-enhanced.ts - Enhanced with future dating
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ request, params, cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  
  const habitId = params.id as string;

  try {
    const body = await request.json();
    const { 
      value = 1,     // 0=missed, 1=completed, 2=skipped, 3=partial
      date,          // ✅ Allow custom date
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
          notes,
          effort,
          duration,
          completion_time,
          energy_level,
          mood,
          location,
          weather,
          context: Array.isArray(context) ? context : context.split(',').filter((c: string) => c.trim()),
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
        notes,
        effort,
        duration,
        completion_time,
        energy_level,
        mood,
        location,
        weather,
        context: Array.isArray(context) ? context : context.split(',').filter((c: string) => c.trim()),
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

// ✅ Enhanced streak calculation that handles skips properly
async function updateHabitStreak(supabase: any, habitId: string, userId: string) {
  const { data: entries } = await supabase
    .from('habit_entries')
    .select('date, value')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(100);

  if (!entries) return;

  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  const today = new Date();
  
  // Calculate current streak (from today backwards)
  for (let i = 0; i < 100; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    const entry = entries.find((e: any) => e.date === dateStr);
    
    if (entry) {
      if (entry.value === 1 || entry.value === 3) { // Completed or partial
        if (i === 0 || currentStreak > 0) currentStreak++;
        tempStreak++;
      } else if (entry.value === 2) { // Skipped - doesn't break streak
        tempStreak++;
        continue;
      } else { // Failed (value = 0)
        if (currentStreak === 0) currentStreak = tempStreak;
        break;
      }
    } else {
      // No entry - only breaks streak if we have an active one
      if (currentStreak > 0) break;
    }
    
    bestStreak = Math.max(bestStreak, tempStreak);
  }

  // Update habit with new streaks
  await supabase
    .from('habits')
    .update({ 
      streak_count: currentStreak,
      best_streak: Math.max(bestStreak, currentStreak)
    })
    .eq('id', habitId);
}
