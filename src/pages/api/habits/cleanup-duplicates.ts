// src/pages/api/habits/cleanup-duplicates.ts - Clean up duplicate habits
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  const serverAuth = createServerAuth(cookies);
  
  try {
    const user = await serverAuth.requireAuth();
    
    console.log('🧹 Starting duplicate habits cleanup...');
    
    // Get all habits for the user
    const { data: habits, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching habits:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch habits',
        details: error.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`📊 Found ${habits.length} habits total`);
    
    // Group by habit name (case insensitive)
    const habitGroups = new Map();
    for (const habit of habits) {
      const key = habit.name.toLowerCase().trim();
      if (!habitGroups.has(key)) {
        habitGroups.set(key, []);
      }
      habitGroups.get(key).push(habit);
    }
    
    console.log(`📊 Found ${habitGroups.size} unique habit names`);
    
    let toDelete = [];
    let kept = [];
    
    // For each group, keep the most recent one and mark others for deletion
    for (const [habitName, habitList] of habitGroups) {
      if (habitList.length > 1) {
        console.log(`🔄 Processing duplicates for "${habitName}": ${habitList.length} copies`);
        
        // Sort by created_at, keep the most recent
        habitList.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const keepHabit = habitList[0];
        const deleteHabits = habitList.slice(1);
        
        kept.push(keepHabit);
        toDelete.push(...deleteHabits);
        
        console.log(`  ✅ Keeping: ${keepHabit.id} (${keepHabit.created_at})`);
        console.log(`  ❌ Deleting: ${deleteHabits.map((h: any) => `${h.id} (${h.created_at})`).join(', ')}`);
      } else {
        kept.push(habitList[0]);
      }
    }
    
    const summary = {
      total_habits: habits.length,
      unique_habits: kept.length,
      duplicates_found: toDelete.length,
      kept_habits: kept.map((h: any) => ({ id: h.id, name: h.name, created_at: h.created_at })),
      deleted_habits: []
    };
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Habits to keep: ${kept.length}`);
    console.log(`  - Habits to delete: ${toDelete.length}`);
    
    if (toDelete.length === 0) {
      console.log('✅ No duplicates found!');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No duplicates found',
        summary
      }), { 
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Delete duplicate habits and their entries
    console.log('\n🗑️ Deleting duplicate habits and their entries...');
    
    const habitIdsToDelete = toDelete.map((h: any) => h.id);
    summary.deleted_habits = toDelete.map((h: any) => ({ id: h.id, name: h.name, created_at: h.created_at }));
    
    // First delete habit entries
    const { error: entriesError } = await supabase
      .from('habit_entries')
      .delete()
      .in('habit_id', habitIdsToDelete);
    
    if (entriesError) {
      console.error('Error deleting habit entries:', entriesError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to delete habit entries',
        details: entriesError.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.log(`✅ Deleted habit entries for ${habitIdsToDelete.length} duplicate habits`);
    }
    
    // Then delete habits
    const { error: habitsError } = await supabase
      .from('habits')
      .delete()
      .in('id', habitIdsToDelete);
    
    if (habitsError) {
      console.error('Error deleting habits:', habitsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to delete duplicate habits',
        details: habitsError.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.log(`✅ Deleted ${habitIdsToDelete.length} duplicate habits`);
    }
    
    console.log('\n✨ Cleanup complete!');
    console.log(`Final count: ${kept.length} unique habits remaining`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: `Successfully cleaned up ${toDelete.length} duplicate habits`,
      summary
    }), { 
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('Cleanup failed:', error);
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