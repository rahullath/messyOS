// src/pages/api/habits/batch-complete.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import { invalidateDailyContextCache } from '../context/today';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
    const body = await request.json();
    const { habitIds, date, value = 1 } = body;

    // Validation
    if (!Array.isArray(habitIds) || habitIds.length === 0) {
      return new Response(JSON.stringify({ error: 'habitIds array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (habitIds.length > 20) {
      return new Response(JSON.stringify({ error: 'Maximum 20 habits can be completed at once' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const results = [];
    const errors = [];

    // Verify all habits belong to the user
    const { data: userHabits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', user.id)
      .in('id', habitIds)
      .eq('is_active', true);

    if (habitsError) {
      throw habitsError;
    }

    if (userHabits.length !== habitIds.length) {
      const foundIds = userHabits.map((h: any) => h.id);
      const missingIds = habitIds.filter(id => !foundIds.includes(id));
      return new Response(JSON.stringify({ 
        error: `Invalid habit IDs: ${missingIds.join(', ')}` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process each habit
    for (const habitId of habitIds) {
      try {
        // Check if already logged for this date
        const { data: existingEntry } = await supabase
          .from('habit_entries')
          .select('id')
          .eq('habit_id', habitId)
          .eq('user_id', user.id)
          .eq('date', targetDate)
          .single();

        if (existingEntry) {
          // Update existing entry
          const { data: updatedEntry, error: updateError } = await supabase
            .from('habit_entries')
            .update({
              value,
              notes: 'Batch completed',
              logged_at: new Date().toISOString()
            })
            .eq('id', existingEntry.id)
            .select()
            .single();

          if (updateError) throw updateError;
          results.push({ habitId, action: 'updated', entry: updatedEntry });
        } else {
          // Create new entry
          const { data: newEntry, error: insertError } = await supabase
            .from('habit_entries')
            .insert([{
              habit_id: habitId,
              user_id: user.id,
              value,
              notes: 'Batch completed',
              logged_at: new Date().toISOString(),
              date: targetDate
            }])
            .select()
            .single();

          if (insertError) throw insertError;
          results.push({ habitId, action: 'created', entry: newEntry });
        }

        // Update streak for this habit
        await updateHabitStreak(supabase, habitId, user.id);

      } catch (error: any) {
        console.error(`Error processing habit ${habitId}:`, error);
        errors.push({ 
          habitId, 
          error: error.message || 'Unknown error' 
        });
      }
    }

    // Return results
    const response = {
      success: results.length,
      failed: errors.length,
      results,
      errors,
      message: `Successfully completed ${results.length} habits${errors.length > 0 ? `, ${errors.length} failed` : ''}`
    };

    // Invalidate daily context cache if any habits were successfully logged
    if (results.length > 0) {
      invalidateDailyContextCache(user.id);
    }

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });

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
    
    console.error('Batch complete API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Enhanced streak calculation that handles skips properly
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
        if (i === 0 || currentStreak > 0) currentStreak++;
        tempStreak++;
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