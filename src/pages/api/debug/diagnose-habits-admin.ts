// Admin diagnostic endpoint that bypasses RLS to see actual database state
import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    console.log('🔍 Admin diagnosis of habits system...');
    
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
    
    // Get ALL habits data bypassing RLS
    const { data: habits, error: habitsError } = await supabaseAdmin
      .from('habits')
      .select('id, name, streak_count, best_streak, user_id, type')
      .limit(20);
    
    if (habitsError) {
      console.error('Habits fetch error:', habitsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Cannot fetch habits (admin)',
        details: habitsError.message
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get ALL habit entries data bypassing RLS
    const { data: entries, error: entriesError } = await supabaseAdmin
      .from('habit_entries')
      .select('id, habit_id, date, value, user_id')
      .limit(50)
      .order('date', { ascending: false });
    
    if (entriesError) {
      console.error('Entries fetch error:', entriesError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Cannot fetch habit entries (admin)',
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
    
    // Get unique users
    const uniqueUsers = [...new Set(habits?.map(h => h.user_id) || [])];
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Admin diagnosis complete - this shows ALL data bypassing RLS',
      analysis: {
        totalHabits: habits?.length || 0,
        totalEntries: entries?.length || 0,
        uniqueUsers: uniqueUsers.length,
        habitsWithZeroStreaks: habits?.filter((h: any) => h.streak_count === 0).length || 0,
        habitsWithPositiveStreaks: habits?.filter((h: any) => h.streak_count > 0).length || 0,
        duplicateHabits: duplicates.length,
        duplicateDetails: duplicates.map(([name, habitsArray]: [string, any]) => ({
          name,
          count: habitsArray.length,
          ids: habitsArray.map((h: any) => h.id)
        })).slice(0, 5)
      },
      sampleHabits: habits?.slice(0, 10),
      sampleEntries: entries?.slice(0, 15),
      userBreakdown: uniqueUsers.slice(0, 5).map(userId => ({
        userId,
        habitCount: habits?.filter((h: any) => h.user_id === userId).length || 0,
        entryCount: entries?.filter((e: any) => e.user_id === userId).length || 0
      }))
    }), { 
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('🚨 Admin diagnosis failed:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Admin diagnosis failed', 
      details: error.message,
      stack: error.stack
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};