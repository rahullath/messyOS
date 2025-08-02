// scripts/test-vaping-fix.ts
// Test script to verify vaping data import fix

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mdhtpjpwwbuepsytgrva.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kaHRwanB3d2J1ZXBzeXRncnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0Mzk2MDIsImV4cCI6MjA0OTAxNTYwMn0.E4vp9Z-wUdcBH5PvLWHZEaJSUiIvQGrnrYrQ0gqOxjM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testVapingFix() {
  const userId = '368deac7-8526-45eb-927a-6a373c95d8c6';
  
  console.log('🧪 Testing vaping data fix...');
  
  // Get vaping habits
  const { data: vapingHabits } = await supabase
    .from('habits')
    .select('id, name, type, streak_count, best_streak, total_completions')
    .eq('user_id', userId)
    .ilike('name', '%vap%');
  
  if (!vapingHabits || vapingHabits.length === 0) {
    console.log('No vaping habits found');
    return;
  }
  
  console.log('\n📋 Found vaping habits:');
  for (const habit of vapingHabits) {
    console.log(`  - ${habit.name} (${habit.type})`);
    console.log(`    Current streak: ${habit.streak_count}`);
    console.log(`    Best streak: ${habit.best_streak}`);
    console.log(`    Total completions: ${habit.total_completions}`);
    
    // Get recent entries
    const { data: entries } = await supabase
      .from('habit_entries')
      .select('date, value')
      .eq('habit_id', habit.id)
      .order('date', { ascending: false })
      .limit(7);
    
    if (entries) {
      console.log('    Recent entries:');
      for (const entry of entries) {
        const isSuccess = entry.value === 0; // 0 puffs = success
        console.log(`      ${entry.date}: ${entry.value} puffs ${isSuccess ? '✅' : '❌'}`);
      }
    }
    console.log('');
  }
  
  console.log('✅ Vaping fix test complete!');
}

testVapingFix().catch(console.error); 