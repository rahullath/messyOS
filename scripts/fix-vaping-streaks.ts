// scripts/fix-vaping-streaks.ts
// Create this file in your project root and run with: npx tsx scripts/fix-vaping-streaks.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mdhtpjpwwbuepsytgrva.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kaHRwanB3d2J1ZXBzeXRncnZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0Mzk2MDIsImV4cCI6MjA0OTAxNTYwMn0.E4vp9Z-wUdcBH5PvLWHZEaJSUiIvQGrnrYrQ0gqOxjM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixVapingStreaks() {
  const userId = '368deac7-8526-45eb-927a-6a373c95d8c6';
  
  console.log('🔄 Fixing vaping streaks...');
  
  // Get all habits
  const { data: habits } = await supabase
    .from('habits')
    .select('id, name, type')
    .eq('user_id', userId);
  
  if (!habits) {
    console.error('No habits found');
    return;
  }
  
  for (const habit of habits) {
    console.log(`\n📋 Processing: ${habit.name} (${habit.type})`);
    
    // Get all entries for this habit
    const { data: entries } = await supabase
      .from('habit_entries')
      .select('date, value')
      .eq('habit_id', habit.id)
      .order('date', { ascending: false });
    
    if (!entries || entries.length === 0) {
      console.log('  No entries found');
      continue;
    }
    
    // Define success logic
    const isSuccess = (value: number): boolean => {
      const lower = habit.name.toLowerCase();
      
      if (lower.includes('vap')) {
        return value === 0; // 0 puffs = success
      } else if (habit.type === 'break') {
        return value > 0; // Other break habits: entry > 0 = success
      } else {
        return value > 0; // Build habits: any positive = success
      }
    };
    
    // Calculate current streak from today backwards
    let currentStreak = 0;
    const today = new Date();
    const entryMap = new Map(entries.map(e => [e.date, e.value]));
    
    for (let i = 0; i < 90; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const value = entryMap.get(dateStr);
      const hasEntry = value !== undefined;
      const success = hasEntry ? isSuccess(value) : false;
      
      if (success) {
        currentStreak++;
      } else if (hasEntry) {
        break; // Entry exists but not successful
      } else {
        if (currentStreak > 0) break; // No entry breaks streak
      }
    }
    
    // Calculate best streak
    let bestStreak = 0;
    let tempStreak = 0;
    const allEntries = [...entries].reverse(); // Oldest first
    
    for (const entry of allEntries) {
      if (isSuccess(entry.value)) {
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }
    
    // Calculate total completions
    const totalCompletions = entries.filter(e => isSuccess(e.value)).length;
    
    // Update habit
    await supabase
      .from('habits')
      .update({ 
        streak_count: currentStreak,
        best_streak: Math.max(bestStreak, currentStreak),
        total_completions: totalCompletions
      })
      .eq('id', habit.id);
    
    console.log(`  ✅ Updated: current=${currentStreak}, best=${Math.max(bestStreak, currentStreak)}, total=${totalCompletions}`);
    
    // Special logging for vaping
    if (habit.name.toLowerCase().includes('vap')) {
      console.log(`  🚭 Vaping Logic: 0 puffs = success`);
      const recentEntries = entries.slice(0, 7);
      console.log(`  📊 Last 7 days:`, recentEntries.map(e => `${e.date}:${e.value}puffs${isSuccess(e.value) ? '✅' : '❌'}`));
    }
  }
  
  console.log('\n🎉 Streak fix complete!');
}

fixVapingStreaks().catch(console.error);
