// src/lib/import/loopHabits.ts - FIXED VERSION
import { createServerClient } from '../supabase/server';
import type { AstroCookies } from 'astro';

export interface LoopHabitsData {
  habits: Array<{
    position: number;
    name: string;
    question: string;
    description: string;
    numRepetitions: number;
    interval: number;
    color: string;
  }>;
  checkmarks: Record<string, Record<string, number>>; // habit_name -> date -> value
  scores: Record<string, Record<string, number>>; // habit_name -> date -> score
}

export async function importLoopHabitsData(
  csvFiles: { habits: string; checkmarks: string; scores: string },
  userId: string,
  cookies: AstroCookies
): Promise<{ success: boolean; message: string; imported: number }> {
  
  console.log('🔄 Starting Loop Habits import for user:', userId);
  
  // Parse habits CSV
  const habitsData = parseHabitsCSV(csvFiles.habits);
  console.log('📋 Parsed habits:', habitsData.length);
  
  // Parse checkmarks CSV (daily entries)
  const checkmarksData = parseCheckmarksCSV(csvFiles.checkmarks);
  console.log('✅ Parsed checkmarks for habits:', Object.keys(checkmarksData));
  
  // Parse scores CSV (calculated scores)
  const scoresData = parseScoresCSV(csvFiles.scores);
  console.log('📊 Parsed scores for habits:', Object.keys(scoresData));
  
  const supabase = createServerClient(cookies);
  
  try {
    // 1. Import habits (avoid duplicates by clearing first)
    console.log('🗑️ Clearing existing habits...');
    await supabase
      .from('habits')
      .delete()
      .eq('user_id', userId);
    
    const habitMap = new Map<string, string>(); // name -> id
    
    console.log('📝 Inserting habits...');
    for (const habit of habitsData) {
      const { data: insertedHabit } = await supabase
        .from('habits')
        .insert({
          user_id: userId,
          name: habit.name,
          description: habit.description || habit.question,
          category: categorizeHabit(habit.name),
          type: determineHabitType(habit.name),
          measurement_type: determineMeasurementType(habit),
          color: habit.color,
          position: habit.position,
          target_value: habit.numRepetitions,
        })
        .select('id, name')
        .single();
      
      if (insertedHabit) {
        habitMap.set(habit.name, insertedHabit.id);
        console.log(`✅ Imported habit: ${habit.name} -> ${insertedHabit.id}`);
      }
    }
    
    // 2. Import checkmarks (daily entries)
    console.log('📅 Processing checkmarks...');
    const entries = [];
    let entryCount = 0;
    
    for (const [habitName, dateEntries] of Object.entries(checkmarksData)) {
      const habitId = habitMap.get(habitName);
      if (!habitId) {
        console.warn(`⚠️ No habit ID found for: ${habitName}`);
        continue;
      }
      
      for (const [dateStr, value] of Object.entries(dateEntries)) {
        if (value !== null && value !== undefined && value > 0) {
          // Convert date format: 2025-04-18 -> proper ISO
          const isoDate = new Date(dateStr).toISOString();
          
          entries.push({
            habit_id: habitId,
            user_id: userId,
            value: value,
            logged_at: isoDate,
            date: dateStr
          });
          entryCount++;
        }
      }
    }
    
    // Batch insert entries
    if (entries.length > 0) {
      console.log(`📥 Inserting ${entries.length} habit entries...`);
      const { error: entriesError } = await supabase
        .from('habit_entries')
        .insert(entries);
      
      if (entriesError) {
        console.error('❌ Error inserting entries:', entriesError);
      } else {
        console.log(`✅ Successfully inserted ${entries.length} entries`);
      }
    }
    
    // 3. Import scores
    console.log('📊 Processing scores...');
    const scores = [];
    for (const [habitName, dateScores] of Object.entries(scoresData)) {
      const habitId = habitMap.get(habitName);
      if (!habitId) continue;
      
      for (const [dateStr, score] of Object.entries(dateScores)) {
        if (score !== null && score !== undefined) {
          scores.push({
            habit_id: habitId,
            score: score,
            date: dateStr,
          });
        }
      }
    }
    
    // Batch insert scores
    if (scores.length > 0) {
      console.log(`📊 Inserting ${scores.length} scores...`);
      await supabase.from('habit_scores').insert(scores);
    }
    
    // 4. Calculate streaks for each habit
    console.log('🔥 Calculating streaks...');
    await calculateAllStreaks(userId, cookies);
    
    return {
      success: true,
      message: `Successfully imported ${habitsData.length} habits with ${entries.length} entries and ${scores.length} scores`,
      imported: habitsData.length
    };
    
  } catch (error: any) {
    console.error('❌ Import error:', error);
    return {
      success: false,
      message: `Import failed: ${error.message}`,
      imported: 0
    };
  }
}

// FIXED: Helper functions for parsing CSVs
function parseHabitsCSV(csv: string) {
  const lines = csv.split('\n').slice(1); // Skip header
  const habits = [];
  
  for (const line of lines) {
    if (!line.trim()) continue; // Skip empty lines
    
    const parts = line.split(',');
    if (parts.length >= 7) {
      habits.push({
        position: parseInt(parts[0]) || 0,
        name: parts[1]?.trim() || '',
        question: parts[2]?.trim() || '',
        description: parts[3]?.trim() || '',
        numRepetitions: parseInt(parts[4]) || 1,
        interval: parseInt(parts[5]) || 1,
        color: parts[6]?.trim() || '#3b82f6'
      });
    }
  }
  
  console.log('📋 Parsed habits:', habits.map(h => h.name));
  return habits;
}

function parseCheckmarksCSV(csv: string) {
  const lines = csv.split('\n');
  const header = lines[0].split(',').map(s => s.trim());
  const data: Record<string, Record<string, number>> = {};
  
  console.log('📅 Checkmarks header:', header);
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = line.split(',').map(s => s.trim());
    const dateStr = values[0];
    if (!dateStr) continue;
    
    for (let j = 1; j < values.length && j < header.length; j++) {
      const habitName = header[j];
      if (!habitName) continue;
      
      if (!data[habitName]) data[habitName] = {};
      
      // FIXED: Convert any non-zero value to 1, handle Loop Habits values (0,2,3)
      const rawValue = parseInt(values[j]) || 0;
      data[habitName][dateStr] = rawValue > 0 ? 1 : 0;
    }
  }
  
  // Log sample data
  Object.keys(data).slice(0, 3).forEach(habit => {
    const entries = Object.keys(data[habit]).length;
    console.log(`📅 ${habit}: ${entries} entries`);
  });
  
  return data;
}

function parseScoresCSV(csv: string) {
  const lines = csv.split('\n');
  const header = lines[0].split(',').map(s => s.trim());
  const data: Record<string, Record<string, number>> = {};
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = line.split(',').map(s => s.trim());
    const dateStr = values[0];
    if (!dateStr) continue;
    
    for (let j = 1; j < values.length && j < header.length; j++) {
      const habitName = header[j];
      if (!habitName) continue;
      
      if (!data[habitName]) data[habitName] = {};
      
      const score = parseFloat(values[j]);
      if (!isNaN(score)) {
        data[habitName][dateStr] = score;
      }
    }
  }
  
  return data;
}

// Smart categorization based on habit names
function categorizeHabit(name: string | undefined | null): string {
  if (!name) return 'General';
  const lower = name.toLowerCase().trim();
  if (lower.includes('gym') || lower.includes('walk') || lower.includes('exercise')) return 'Fitness';
  if (lower.includes('vap') || lower.includes('smoke') || lower.includes('drink') || lower.includes('pot')) return 'Health';
  if (lower.includes('code') || lower.includes('build') || lower.includes('university')) return 'Productivity';
  if (lower.includes('shower') || lower.includes('wake')) return 'Self Care';
  if (lower.includes('valorant') || lower.includes('game')) return 'Entertainment';
  return 'General';
}

function determineHabitType(name: string | undefined | null): 'build' | 'break' {
  if (!name) return 'build';
  const lower = name.toLowerCase().trim();
  if (lower.includes('quit') || lower.includes('no ') || lower.includes('stop')) return 'break';
  return 'build';
}

function determineMeasurementType(habit: any): 'boolean' | 'count' | 'duration' | 'rating' {
  if (habit.question?.toLowerCase().includes('did you')) return 'boolean';
  if (habit.question?.toLowerCase().includes('how many')) return 'count';
  if (habit.numRepetitions === 1) return 'boolean';
  return 'count';
}

// Placeholder for streak calculation
// Replace the placeholder function with this real implementation
async function calculateAllStreaks(userId: string, cookies: AstroCookies) {
  console.log('🔥 Calculating streaks for user:', userId);
  
  const supabase = createServerClient(cookies);
  
  // Get all habits for this user
  const { data: habits } = await supabase
    .from('habits')
    .select('id, name')
    .eq('user_id', userId);
  
  if (!habits) return;
  
  for (const habit of habits) {
    // Get all entries for this habit, ordered by date
    const { data: entries } = await supabase
      .from('habit_entries')
      .select('date, value')
      .eq('habit_id', habit.id)
      .order('date', { ascending: false });
    
    if (!entries || entries.length === 0) continue;
    
    // Calculate current streak from today backwards
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    
    const today = new Date();
    const dates = entries.map(e => e.date);
    
    // Calculate current streak (from today backwards)
    for (let i = 0; i < 30; i++) { // Check last 30 days
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const hasEntry = dates.includes(dateStr);
      
      if (hasEntry) {
        if (i === 0 || currentStreak > 0) { // Must be consecutive from today
          currentStreak++;
        }
      } else {
        break; // Streak broken
      }
    }
    
    // Calculate best streak
    for (const entry of entries) {
      if (entry.value > 0) {
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
        total_completions: entries.length
      })
      .eq('id', habit.id);
    
    console.log(`🔥 ${habit.name}: current=${currentStreak}, best=${bestStreak}`);
  }
}