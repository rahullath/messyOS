import type { APIRoute } from 'astro';
import { createServerClient } from '../../../../lib/supabase/server';

export const POST: APIRoute = async ({ request, params }) => {
  const supabase = createServerClient();
  const habitId = params.id as string;
  
  try {
    const body = await request.json();
    const { value = 1, notes = '' } = body;

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = user.id;

    // Check if already logged today
    const todayIso = new Date().toISOString().split('T')[0];
    const { data: existingEntry } = await supabase
      .from('habit_entries')
      .select('id')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('date', todayIso)
      .single();

    if (existingEntry) {
      return new Response(JSON.stringify({ error: 'Already logged today' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log the habit entry
    const { data: entry, error } = await supabase
      .from('habit_entries')
      .insert([{
        habit_id: habitId,
        user_id: userId,
        value,
        notes,
        logged_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Update streak count (simplified for now)
    const { error: updateError } = await supabase
      .from('habits')
      .update({ 
        streak_count: 1, // We'll make this smarter later
        total_completions: supabase.raw('total_completions + 1')
      })
      .eq('id', habitId);

    if (updateError) {
      console.error('Streak update error:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      entry,
      message: 'Habit logged successfully!' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to log habit',
      details: error
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};