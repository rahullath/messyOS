// Simple diagnostic endpoint to see current habits state
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

export const GET: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    console.log('🔍 Diagnosing habits system...');
    
    // Get habits data
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, streak_count, best_streak, user_id, type')
      .limit(10);
    
    if (habitsError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Cannot fetch habits',
        details: habitsError.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get habit entries data
    const { data: entries, error: entriesError } = await supabase
      .from('habit_entries')
      .select('id, habit_id, date, value, user_id')
      .limit(20)
      .order('date', { ascending: false });
    
    if (entriesError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Cannot fetch habit entries',
        details: entriesError.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Count duplicates by habit name
    const habitsByName = habits?.reduce((acc: any, habit: any) => {
      const name = habit.name;
      if (!acc[name]) {
        acc[name] = [];
      }
      acc[name].push(habit);
      return acc;
    }, {}) || {};
    
    const duplicates = Object.entries(habitsByName).filter(([name, habitsArray]: [string, any]) => habitsArray.length > 1);
    
    // Count entries by habit
    const entriesByHabit = entries?.reduce((acc: any, entry: any) => {
      const habitId = entry.habit_id;
      acc[habitId] = (acc[habitId] || 0) + 1;
      return acc;
    }, {}) || {};
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Diagnosis complete',
      analysis: {
        totalHabits: habits?.length || 0,
        totalEntries: entries?.length || 0,
        habitsWithZeroStreaks: habits?.filter((h: any) => h.streak_count === 0).length || 0,
        habitsWithPositiveStreaks: habits?.filter((h: any) => h.streak_count > 0).length || 0,
        duplicateHabits: duplicates.length,
        duplicateDetails: duplicates.map(([name, habitsArray]: [string, any]) => ({
          name,
          count: habitsArray.length,
          ids: habitsArray.map((h: any) => h.id)
        }))
      },
      sampleHabits: habits?.slice(0, 5),
      sampleEntries: entries?.slice(0, 10),
      entriesByHabit: Object.keys(entriesByHabit).slice(0, 5).map(habitId => ({
        habitId,
        entryCount: entriesByHabit[habitId],
        habitName: habits?.find((h: any) => h.id === habitId)?.name || 'Unknown'
      }))
    }), { 
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('🚨 Diagnosis failed:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Diagnosis failed', 
      details: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};