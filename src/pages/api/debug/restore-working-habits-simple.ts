// Simple debug endpoint to restore the working habits system without auth
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';

export const POST: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  
  try {
    console.log('🔧 Restoring beautiful working habits system...');
    
    // First, let's just try to recalculate streaks using the existing recalculate-streaks API logic
    // This will test if we can access the database and fix the zero streaks issue
    
    const testSQL = `
      -- Test if calculate_habit_streak function exists
      SELECT proname FROM pg_proc WHERE proname = 'calculate_habit_streak';
    `;
    
    const { data: functions, error: testError } = await supabase.rpc('exec_sql', { sql_query: testSQL });
    
    if (testError) {
      console.error('Database access error:', testError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Cannot access database',
        details: testError.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Try to get habits to see what's going on
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name, streak_count, best_streak, user_id')
      .limit(5);
    
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
    
    // Try to get habit entries to see what data we have
    const { data: entries, error: entriesError } = await supabase
      .from('habit_entries')
      .select('id, habit_id, date, value')
      .limit(10);
    
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
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Database connection working',
      functionsFound: functions,
      sampleHabits: habits,
      sampleEntries: entries,
      analysis: {
        totalHabits: habits?.length || 0,
        habitsWithZeroStreaks: habits?.filter(h => h.streak_count === 0).length || 0,
        totalEntries: entries?.length || 0,
        databaseConnection: 'OK'
      }
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