// src/pages/api/habits/recalculate-streaks.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';
import type { Tables } from '../../../types/supabase';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
    
    console.log('🔄 Recalculating streaks for user:', user.id);
    
    // Get all habits for this user
    const { data: habits } = await supabase
      .from('habits')
      .select('id, name, type')
      .eq('user_id', user.id);
    
    if (!habits) throw new Error('No habits found');
    
    const results = [];
    
    for (const habit of habits) {
      // Get all entries for this habit, ordered by date descending
      const { data: entries } = await supabase
        .from('habit_entries')
        .select('date, value')
        .eq('habit_id', habit.id)
        .order('date', { ascending: false });
      
      if (!entries || entries.length === 0) {
        results.push({ habit: habit.name, current: 0, best: 0 });
        continue;
      }
      
      // Define success based on habit type and name
      const isSuccess = (value: number | null, habitName: string, habitType: string): boolean => {
        if (value === null) return false;
        const lower = habitName.toLowerCase();
        
        if (lower.includes('vap')) {
          return value === 0; // 0 puffs = success
        } else if (habitType === 'break') {
          return value > 0; // Other break habits: entry > 0 = success
        } else {
          return value > 0; // Build habits: any positive = success
        }
      };
      
      // Calculate current streak from today backwards
      let currentStreak = 0;
      let bestStreak = 0;
      let tempStreak = 0;
      
      const today = new Date();
      const entryMap = new Map(entries.map((e: any) => [e.date, e.value]));
      
      // Current streak calculation
      for (let i = 0; i < 90; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const value = entryMap.get(dateStr);
        const hasEntry = value !== undefined;
        const success = hasEntry ? isSuccess(value, habit.name, habit.type!) : false;
        
        if (success) {
          currentStreak++;
        } else if (hasEntry) {
          break; // Entry exists but not successful
        } else {
          if (currentStreak > 0) break; // No entry breaks streak
        }
      }
      
      // Best streak calculation
      const allEntries = [...entries].reverse(); // Oldest first
      for (const entry of allEntries) {
        if (isSuccess(entry.value, habit.name, habit.type!)) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
      
      // Update habit with calculated streaks
      await supabase
        .from('habits')
        .update({ 
          streak_count: currentStreak,
          best_streak: Math.max(bestStreak, currentStreak),
          total_completions: entries.filter((e: any) => 
            isSuccess(e.value, habit.name, habit.type!)
          ).length
        })
        .eq('id', habit.id);
      
      results.push({
        habit: habit.name,
        current: currentStreak,
        best: Math.max(bestStreak, currentStreak),
        type: habit.type
      });
      
      console.log(`🔥 ${habit.name}: current=${currentStreak}, best=${bestStreak}`);
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: `Recalculated streaks for ${habits.length} habits`,
      results
    }), {
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
    
    console.error('API Error:', error);
    console.error('Error recalculating streaks:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to recalculate streaks',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
