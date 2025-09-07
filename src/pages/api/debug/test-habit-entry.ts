// Debug endpoint to test habit entry insertion
import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase/server';
import { createServerAuth } from '../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  const serverAuth = createServerAuth(cookies);
  
  try {
    const user = await serverAuth.requireAuth();
    
    console.log('🧪 Testing habit entry insertion...');
    
    // Get the first habit
    const { data: habits, error: habitsError } = await supabase
      .from('habits')
      .select('id, name')
      .eq('user_id', user.id)
      .limit(1);
    
    if (habitsError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch habits',
        details: habitsError
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!habits || habits.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No habits found for user'
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const habit = habits[0];
    const testDate = '2025-01-01';
    
    console.log(`🎯 Testing with habit: ${habit.name} (${habit.id})`);
    
    // Try to insert a test entry
    const { data: entry, error: entryError } = await supabase
      .from('habit_entries')
      .insert({
        habit_id: habit.id,
        user_id: user.id,
        value: 1,
        logged_at: new Date(testDate).toISOString(),
        date: testDate,
        notes: 'Debug test entry'
      })
      .select()
      .single();
    
    if (entryError) {
      console.error('❌ Entry insertion failed:', entryError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to insert habit entry',
        details: entryError,
        habit: { id: habit.id, name: habit.name }
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('✅ Entry inserted successfully:', entry);
    
    // Clean up the test entry
    await supabase
      .from('habit_entries')
      .delete()
      .eq('id', entry.id);
    
    console.log('🧹 Test entry cleaned up');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Habit entry insertion test passed',
      habit: { id: habit.id, name: habit.name },
      testEntry: entry
    }), { 
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('🚨 Debug test error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Debug test failed',
      details: error.message
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};