// src/lib/import/loopHabits.ts
import { createServerClient } from '../supabase/server';

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
  userId: string
): Promise<{ success: boolean; message: string; imported: number }> {
  
  // Parse habits CSV
  const habitsData = parseHabitsCSV(csvFiles.habits);
  
  // Parse checkmarks CSV (daily entries)
  const checkmarksData = parseCheckmarksCSV(csvFiles.checkmarks);
  
  // Parse scores CSV (calculated scores)
  const scoresData = parseScoresCSV(csvFiles.scores);
  
  const supabase = createServerClient();
  
  try {
    // 1. Import habits
    const habitMap = new Map<string, string>(); // name -> id
    
    for (const habit of habitsData) {
      const { data: insertedHabit } = await supabase
        .from('habits')
        .insert({
          user_id: userId,
          name: habit.name,
          description: habit.description || habit.question,
          category: categorizeHabit(habit.name), // Smart categorization
          type: determineHabitType(habit.name), // build vs break
          measurement_type: determineMeasurementType(habit),
          color: habit.color,
          position: habit.position,
          target_value: habit.numRepetitions,
        })
        .select('id, name')
        .single();
      
      if (insertedHabit) {
        habitMap.set(habit.name, insertedHabit.id);
      }
    }
    
    // 2. Import checkmarks (daily entries)
    const entries = [];
    for (const [habitName, dateEntries] of Object.entries(checkmarksData)) {
      const habitId = habitMap.get(habitName);
      if (!habitId) continue;
      
      for (const [dateStr, value] of Object.entries(dateEntries)) {
        if (value !== null && value !== undefined) {
          entries.push({
            habit_id: habitId,
            user_id: userId,
            value: value,
            logged_at: new Date(dateStr).toISOString(),
          });
        }
      }
    }
    
    // Batch insert entries
    if (entries.length > 0) {
      await supabase.from('habit_entries').insert(entries);
    }
    
    // 3. Import scores
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
      await supabase.from('habit_scores').insert(scores);
    }
    
    // 4. Calculate streaks for each habit
    await calculateAllStreaks(userId);
    
    return {
      success: true,
      message: `Successfully imported ${habitsData.length} habits with ${entries.length} entries`,
      imported: habitsData.length
    };
    
  } catch (error: any) {
    console.error('Import error:', error);
    return {
      success: false,
      message: `Import failed: ${error.message}`,
      imported: 0
    };
  }
}


// Helper functions for parsing CSVs (simplified, you'd use a proper CSV parser)
function parseHabitsCSV(csv: string) {
  const lines = csv.split('\n').slice(1); // Skip header
  return lines.map(line => {
    const [position, name, question, description, numRepetitions, interval, color] = line.split(',').map(s => s.trim());
    return {
      position: parseInt(position),
      name,
      question,
      description,
      numRepetitions: parseInt(numRepetitions),
      interval: parseInt(interval),
      color
    };
  });
}

function parseCheckmarksCSV(csv: string) {
  const lines = csv.split('\n');
  const header = lines[0].split(',').map(s => s.trim());
  const data: Record<string, Record<string, number>> = {};
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(s => s.trim());
    const habitName = values[0];
    if (!habitName) continue; // Skip empty lines or lines without habit name
    data[habitName] = {};
    for (let j = 1; j < values.length; j++) {
      const date = header[j];
      if (!date) continue;
      data[habitName][date] = parseInt(values[j]);
    }
  }
  return data;
}

function parseScoresCSV(csv: string) {
  const lines = csv.split('\n');
  const header = lines[0].split(',').map(s => s.trim());
  const data: Record<string, Record<string, number>> = {};
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(s => s.trim());
    const habitName = values[0];
    if (!habitName) continue; // Skip empty lines or lines without habit name
    data[habitName] = {};
    for (let j = 1; j < values.length; j++) {
      const date = header[j];
      if (!date) continue;
      data[habitName][date] = parseFloat(values[j]);
    }
  }
  return data;
}

// Smart categorization based on habit names
function categorizeHabit(name: string | undefined | null): string {
  if (!name) return 'General'; // Handle undefined or null names
  const lower = name.toLowerCase().trim(); // Trim whitespace
  if (lower.includes('gym') || lower.includes('walk') || lower.includes('exercise')) return 'Fitness';
  if (lower.includes('vap') || lower.includes('smoke') || lower.includes('drink')) return 'Health';
  if (lower.includes('code') || lower.includes('build') || lower.includes('university')) return 'Productivity';
  if (lower.includes('shower') || lower.includes('wake')) return 'Self Care';
  if (lower.includes('valorant') || lower.includes('game')) return 'Entertainment';
  return 'General';
}

function determineHabitType(name: string | undefined | null): 'build' | 'break' {
  if (!name) return 'build'; // Default to build if name is undefined or null
  const lower = name.toLowerCase().trim(); // Trim whitespace
  if (lower.includes('quit') || lower.includes('no ') || lower.includes('stop')) return 'break';
  return 'build';
}

function determineMeasurementType(habit: any): 'boolean' | 'count' | 'duration' | 'rating' {
  if (habit.question?.toLowerCase().includes('did you')) return 'boolean';
  if (habit.question?.toLowerCase().includes('how many')) return 'count';
  if (habit.numRepetitions === 1) return 'boolean';
  return 'count';
}

// Placeholder for streak calculation (will be implemented later)
async function calculateAllStreaks(userId: string) {
  console.log('Calculating streaks for user:', userId);
  // This function will be implemented in a later phase
  return Promise.resolve();
}
