import { createServerClient } from '../supabase/server';
import type { Database } from '../../types/supabase.ts'; // Explicit relative path with .ts extension

export async function getDashboardData(cookies: any) { // Accept cookies directly
  const supabase = createServerClient(cookies); // Pass cookies to createServerClient
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  // Fetch all dashboard data in parallel
  const [habitsResult, tasksResult, metricsResult] = await Promise.all([
    // Habits with today's entries
    supabase
      .from('habits')
      .select(`
        *,
        habit_entries(
          id,
          value,
          logged_at
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true),
    
    // Tasks summary
    supabase
      .from('tasks')
      .select('id, status, priority, created_at')
      .eq('user.id', user.id), // Corrected to user.id
    
    // Recent metrics
    supabase
      .from('metrics')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(10)
  ]);

  if (habitsResult.error || tasksResult.error || metricsResult.error) {
    return { error: 'Failed to fetch data' };
  }

  // Process habits data
  const today = new Date().toDateString();
  const habitsWithProgress = habitsResult.data?.map((habit: Database['public']['Tables']['habits']['Row'] & { habit_entries: Database['public']['Tables']['habit_entries']['Row'][] | null }) => {
    const todayEntry = habit.habit_entries?.find((entry: Database['public']['Tables']['habit_entries']['Row']) => 
      new Date(entry.logged_at!).toDateString() === today
    );
    
    return {
      ...habit,
      completedToday: !!todayEntry,
      todayValue: todayEntry?.value || 0
    };
  }) || [];

  // Process tasks data
  const taskStats = {
    total: tasksResult.data?.length || 0,
    completed: tasksResult.data?.filter(t => t.status === 'completed').length || 0,
    pending: tasksResult.data?.filter(t => t.status === 'todo' || t.status === 'in_progress').length || 0
  };

  return {
    user,
    habits: habitsWithProgress,
    taskStats,
    recentMetrics: metricsResult.data || []
  };
}
