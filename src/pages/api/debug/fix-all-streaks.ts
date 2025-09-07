// Fix all zero streaks by recalculating them using the working logic
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    console.log('🔥 Fixing all zero streaks...');
    
    // Create admin client that bypasses RLS
    const supabaseAdmin = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Get all habits
    const { data: habits, error: habitsError } = await supabaseAdmin
      .from('habits')
      .select('id, name, type, user_id')
      .eq('is_active', true);
    
    if (habitsError || !habits) {
      throw new Error(`Failed to fetch habits: ${habitsError?.message}`);
    }
    
    console.log(`🔍 Found ${habits.length} active habits to recalculate`);
    
    const results = [];
    
    for (const habit of habits) {
      console.log(`🔥 Recalculating streaks for: ${habit.name} (${habit.id})`);
      
      // Get all entries for this habit, ordered by date descending
      const { data: entries, error: entriesError } = await supabaseAdmin
        .from('habit_entries')
        .select('date, value')
        .eq('habit_id', habit.id)
        .order('date', { ascending: false });
      
      if (entriesError) {
        console.error(`❌ Error fetching entries for ${habit.name}:`, entriesError);
        results.push({ habit: habit.name, error: entriesError.message, current: 0, best: 0 });
        continue;
      }
      
      if (!entries || entries.length === 0) {
        console.log(`⚠️ No entries found for ${habit.name}`);
        results.push({ habit: habit.name, current: 0, best: 0, entries: 0 });
        continue;
      }
      
      // Define success based on habit type and name (using the working logic from recalculate-streaks.ts)
      const isSuccess = (value: number | null, habitName: string, habitType: string): boolean => {
        if (value === null) return false;
        const lower = habitName.toLowerCase();
        
        if (lower.includes('vap')) {
          return value === 0; // 0 puffs = success for vaping
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
        const success = hasEntry ? isSuccess(value, habit.name, habit.type || 'build') : false;
        
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
        if (isSuccess(entry.value, habit.name, habit.type || 'build')) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
      
      // Update habit with calculated streaks
      const { error: updateError } = await supabaseAdmin
        .from('habits')
        .update({ 
          streak_count: currentStreak,
          best_streak: Math.max(bestStreak, currentStreak),
          updated_at: new Date().toISOString()
        })
        .eq('id', habit.id);
      
      if (updateError) {
        console.error(`❌ Error updating ${habit.name}:`, updateError);
        results.push({ 
          habit: habit.name, 
          error: `Update failed: ${updateError.message}`, 
          current: currentStreak, 
          best: bestStreak 
        });
      } else {
        results.push({
          habit: habit.name,
          current: currentStreak,
          best: Math.max(bestStreak, currentStreak),
          entries: entries.length,
          type: habit.type
        });
        
        console.log(`✅ ${habit.name}: current=${currentStreak}, best=${bestStreak}, entries=${entries.length}`);
      }
    }
    
    const successfulUpdates = results.filter(r => !r.error).length;
    const failedUpdates = results.filter(r => r.error).length;
    
    return new Response(JSON.stringify({
      success: true,
      message: `Fixed streaks for ${successfulUpdates}/${habits.length} habits`,
      successfulUpdates,
      failedUpdates,
      totalHabits: habits.length,
      results: results,
      summary: {
        habitsWithStreaks: results.filter(r => !r.error && r.current > 0).length,
        habitsStillZero: results.filter(r => !r.error && r.current === 0).length,
        totalEntriesProcessed: results.reduce((sum, r) => sum + (r.entries || 0), 0)
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('🚨 Streak fixing failed:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Streak fixing failed', 
      details: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};