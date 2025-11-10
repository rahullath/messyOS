// Clean up duplicate habits to restore the beautiful system
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ cookies }) => {
  try {
    console.log('🧹 Cleaning up duplicate habits...');
    
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
    
    // Get all habits grouped by name and user_id
    const { data: habits, error: habitsError } = await supabaseAdmin
      .from('habits')
      .select('id, name, user_id, created_at, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    
    if (habitsError || !habits) {
      throw new Error(`Failed to fetch habits: ${habitsError?.message}`);
    }
    
    console.log(`🔍 Found ${habits.length} active habits to check for duplicates`);
    
    // Group habits by name + user_id combination
    const habitGroups = habits.reduce((acc: any, habit: any) => {
      const key = `${habit.user_id}:${habit.name}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(habit);
      return acc;
    }, {});
    
    const duplicateGroups = Object.entries(habitGroups).filter(([key, habitsArray]: [string, any]) => habitsArray.length > 1);
    
    console.log(`📊 Found ${duplicateGroups.length} groups with duplicates`);
    
    const cleanupResults = [];
    let totalDeleted = 0;
    
    for (const [key, duplicateHabits] of duplicateGroups) {
      const [userId, habitName] = key.split(':');
      console.log(`🧹 Processing duplicates for: ${habitName} (${duplicateHabits.length} copies)`);
      
      // Sort by created_at to keep the oldest one (most likely to have data)
      const sortedHabits = duplicateHabits.sort((a: any, b: any) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      // Get entry counts for each habit to make an informed decision
      const habitsWithEntryCounts = await Promise.all(
        sortedHabits.map(async (habit: any) => {
          const { count } = await supabaseAdmin
            .from('habit_entries')
            .select('*', { count: 'exact', head: true })
            .eq('habit_id', habit.id);
          
          return { ...habit, entryCount: count || 0 };
        })
      );
      
      // Keep the habit with the most entries, or the oldest if they have the same count
      const habitToKeep = habitsWithEntryCounts.reduce((best: any, current: any) => {
        if (current.entryCount > best.entryCount) return current;
        if (current.entryCount === best.entryCount && new Date(current.created_at) < new Date(best.created_at)) return current;
        return best;
      });
      
      // Delete the others
      const habitsToDelete = habitsWithEntryCounts.filter((h: any) => h.id !== habitToKeep.id);
      
      console.log(`📌 Keeping: ${habitName} (ID: ${habitToKeep.id}, entries: ${habitToKeep.entryCount})`);
      console.log(`🗑️ Deleting: ${habitsToDelete.length} duplicates`);
      
      for (const habitToDelete of habitsToDelete) {
        // First, delete any entries for this duplicate habit
        const { error: entriesDeleteError } = await supabaseAdmin
          .from('habit_entries')
          .delete()
          .eq('habit_id', habitToDelete.id);
        
        if (entriesDeleteError) {
          console.error(`❌ Error deleting entries for ${habitToDelete.id}:`, entriesDeleteError);
        } else {
          console.log(`🗑️ Deleted ${habitToDelete.entryCount} entries for duplicate habit`);
        }
        
        // Then delete the habit itself
        const { error: habitDeleteError } = await supabaseAdmin
          .from('habits')
          .delete()
          .eq('id', habitToDelete.id);
        
        if (habitDeleteError) {
          console.error(`❌ Error deleting habit ${habitToDelete.id}:`, habitDeleteError);
        } else {
          console.log(`✅ Deleted duplicate habit: ${habitName}`);
          totalDeleted++;
        }
      }
      
      cleanupResults.push({
        habitName,
        duplicatesFound: duplicateHabits.length,
        duplicatesDeleted: habitsToDelete.length,
        keptHabit: {
          id: habitToKeep.id,
          entryCount: habitToKeep.entryCount
        }
      });
    }
    
    // Get final counts
    const { data: finalHabits } = await supabaseAdmin
      .from('habits')
      .select('id, name')
      .eq('is_active', true);
    
    const { data: finalEntries } = await supabaseAdmin
      .from('habit_entries')
      .select('id')
      .limit(1000);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Cleaned up ${totalDeleted} duplicate habits`,
      cleanup: {
        duplicateGroupsFound: duplicateGroups.length,
        totalHabitsDeleted: totalDeleted,
        finalHabitCount: finalHabits?.length || 0,
        finalEntryCount: finalEntries?.length || 0
      },
      details: cleanupResults,
      summary: {
        before: `${habits.length} habits with duplicates`,
        after: `${finalHabits?.length || 0} unique habits`,
        entriesPreserved: finalEntries?.length || 0
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('🚨 Cleanup failed:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Cleanup failed', 
      details: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};