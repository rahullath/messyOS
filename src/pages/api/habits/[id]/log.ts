// src/pages/api/habits/[id]/log.ts
import type { APIRoute } from 'astro';
import { createServerAuth } from '../../../../lib/auth/simple-multi-user';

export const POST: APIRoute = async ({ request, params, cookies }) => {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();
    const supabase = serverAuth.supabase;
  
  
  const habitId = params.id as string;

  try {
    const body = await request.json();
    const { value = 1, notes } = body;

    // Check if already logged today
    const todayIso = new Date().toISOString().split('T')[0];
    const { data: existingEntry } = await supabase
      .from('habit_entries')
      .select('id')
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .gte('logged_at', `${todayIso}T00:00:00.000Z`)
      .lt('logged_at', `${todayIso}T23:59:59.999Z`)
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
        user_id: user.id,
        value,
        notes,
        logged_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Update streak count
    await updateHabitStreak(supabase, habitId, user.id);

    return new Response(JSON.stringify(entry), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    // Handle auth errors
    if (error.message === 'Authentication required') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Please sign in to continue'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function updateHabitStreak(supabase: any, habitId: string, userId: string) {
  // Get last 30 days of entries
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: entries } = await supabase
    .from('habit_entries')
    .select('logged_at')
    .eq('habit_id', habitId)
    .eq('user_id', userId)
    .gte('logged_at', thirtyDaysAgo.toISOString())
    .order('logged_at', { ascending: false });

  // Calculate current streak
  let streak = 0;
  const today = new Date();
  
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const checkDateStr = checkDate.toISOString().split('T')[0];
    
    const hasEntry = entries?.some((entry: { logged_at: string | null }) => 
      entry.logged_at?.split('T')[0] === checkDateStr
    );
    
    if (hasEntry) {
      streak++;
    } else {
      break;
    }
  }

  // Update streak count
  await supabase
    .from('habits')
    .update({ streak_count: streak })
    .eq('id', habitId);
}
