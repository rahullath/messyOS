import { createServerClient } from '../supabase/server';
import type { AstroCookies } from 'astro';
import type { Session } from '@supabase/supabase-js';
import type { Database, Tables } from '../../types/supabase';

type Habit = Tables<'habits'> & { 
  habit_entries?: Tables<'habit_entries'>[];
  completedToday?: boolean;
};

type Task = Tables<'tasks'>;
type Metric = Tables<'metrics'>;

export async function getDashboardData(cookies: AstroCookies, session: Session | null) {
  // Fallback for no session with more detailed error
  if (!session) {
    return {
      error: 'Authentication required. Please log in.',
      user: null,
      habits: [],
      taskStats: { total: 0, completed: 0, pending: 0 },
      recentMetrics: [],
      status: 'unauthenticated'
    };
  }

  const supabase = createServerClient(cookies);
  
  try {
    // Fetch dashboard data with enhanced error handling
    const [habitsResult, tasksResult, metricsResult] = await Promise.allSettled([
      supabase.from('habits').select('*, habit_entries(*)').limit(10),
      supabase.from('tasks').select('*').limit(50),
      supabase.from('metrics').select('*').limit(5)
    ]);

    // Process habits
    const habitsData: Habit[] = habitsResult.status === 'fulfilled' 
      ? habitsResult.value.data || [] 
      : [];

    // Process tasks
    const tasksData: Task[] = tasksResult.status === 'fulfilled' 
      ? tasksResult.value.data || [] 
      : [];

    // Process metrics
    const metricsData: Metric[] = metricsResult.status === 'fulfilled' 
      ? metricsResult.value.data || [] 
      : [];

    // Calculate task statistics
    const taskStats = tasksData.reduce((stats, task) => {
      stats.total++;
      if (task.status === 'completed') stats.completed++;
      else stats.pending++;
      return stats;
    }, { total: 0, completed: 0, pending: 0 });

    // Enrich habits with today's completion status
    const today = new Date().toISOString().split('T')[0];
    const enrichedHabits = habitsData.map(habit => ({
      ...habit,
      completedToday: habit.habit_entries?.some(
        (entry: Tables<'habit_entries'>) => entry.logged_at?.split('T')[0] === today
      ) || false
    }));

    return {
      user: { 
        email: session.user.email, 
        id: session.user.id 
      },
      habits: enrichedHabits,
      taskStats,
      recentMetrics: metricsData,
      status: 'success'
    };
  } catch (error) {
    console.error('Dashboard data retrieval error:', error);
    
    return {
      error: 'Failed to retrieve dashboard data. Please try again.',
      user: { 
        email: session.user.email, 
        id: session.user.id 
      },
      habits: [],
      taskStats: { total: 0, completed: 0, pending: 0 },
      recentMetrics: [],
      status: 'error'
    };
  }
}
