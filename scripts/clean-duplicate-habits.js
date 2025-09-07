// Script to clean up duplicate habits and keep the most recent ones
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://mdhtpjpwwbuepsytgtrc.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kaHRwanB3d2J1ZXBzeXRndHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MDQzOTEsImV4cCI6MjA1MjI4MDM5MX0.v6O3mjd1mYo6bDqT5NtIpDjh0B8MHNcHOVZNPe5-u_c';
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupDuplicateHabits() {
  console.log('🧹 Starting duplicate habits cleanup...');
  
  try {
    // Get all habits for the user
    const { data: habits, error } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', '70429eba-f32e-47ab-bfcb-a75e2f819de4')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching habits:', error);
      return;
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
        habitList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const keepHabit = habitList[0];
        const deleteHabits = habitList.slice(1);
        
        kept.push(keepHabit);
        toDelete.push(...deleteHabits);
        
        console.log(`  ✅ Keeping: ${keepHabit.id} (${keepHabit.created_at})`);
        console.log(`  ❌ Deleting: ${deleteHabits.map(h => `${h.id} (${h.created_at})`).join(', ')}`);
      } else {
        kept.push(habitList[0]);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`  - Habits to keep: ${kept.length}`);
    console.log(`  - Habits to delete: ${toDelete.length}`);
    
    if (toDelete.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }
    
    // Delete duplicate habits and their entries
    console.log('\n🗑️ Deleting duplicate habits and their entries...');
    
    const habitIdsToDelete = toDelete.map(h => h.id);
    
    // First delete habit entries
    const { error: entriesError } = await supabase
      .from('habit_entries')
      .delete()
      .in('habit_id', habitIdsToDelete);
    
    if (entriesError) {
      console.error('Error deleting habit entries:', entriesError);
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
    } else {
      console.log(`✅ Deleted ${habitIdsToDelete.length} duplicate habits`);
    }
    
    console.log('\n✨ Cleanup complete!');
    console.log(`Final count: ${kept.length} unique habits remaining`);
    
    // Show the final unique habits
    console.log('\n📋 Remaining unique habits:');
    kept.sort((a, b) => a.position - b.position);
    kept.forEach((habit, index) => {
      console.log(`${index + 1}. ${habit.name} (${habit.category}) - Position: ${habit.position}`);
    });
    
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
}

// Run the cleanup
cleanupDuplicateHabits();