// src/lib/habits/streaks.ts
import type { SupabaseClient } from '@supabase/supabase-js';

export async function updateHabitStreak(supabase: SupabaseClient, habitId: string, userId: string) {
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
