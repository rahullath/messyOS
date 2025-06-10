import { createServerClient } from '../supabase/server';
import type { AstroCookies } from 'astro';
import type { Session } from '@supabase/supabase-js';
import type { Database, Tables } from '../../types/supabase';
import type { Transaction } from '../finance/financeImporter'; // Import Transaction interface

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

// 6. CATEGORY BREAKDOWN FOR DASHBOARD
export function generateCategoryBreakdown(transactions: Transaction[]) {
  const categoryMap = new Map();
  const expenses = transactions.filter((t: Transaction) => t.amount < 0);
  
  for (const transaction of expenses) {
    const category = transaction.category;
    const amount = Math.abs(transaction.amount);
    
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { total: 0, count: 0, transactions: [] });
    }
    
    const categoryData = categoryMap.get(category);
    categoryData.total += amount;
    categoryData.count += 1;
    categoryData.transactions.push(transaction);
  }
  
  const totalExpenses = expenses.reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0);
  
  return Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      percentage: (data.total / totalExpenses) * 100,
      count: data.count,
      avgAmount: data.total / data.count,
      dailyAvg: data.total / 30
    }))
    .sort((a, b) => b.total - a.total);
}

// 7. VALIDATION FUNCTIONS
export function validateFinanceData(data: any) {
  const issues = [];
  
  // Check if expenses seem reasonable for ₹55k income
  if (data.summary?.totalExpenses > 100000) {
    issues.push(`Monthly expenses (₹${data.summary.totalExpenses.toLocaleString()}) seem too high for ₹55k income`);
  }
  
  // Check crypto value
  if (data.summary?.cryptoValue === 0 && data.crypto?.length > 0) {
    issues.push('Crypto holdings exist but total value is $0');
  }
  
  // Check for excessive transfers
  const transferAmount = data.transactions
    ?.filter((t: Transaction) => t.category === 'UPI Transfer')
    ?.reduce((sum: number, t: Transaction) => sum + Math.abs(t.amount), 0) || 0;
  
  if (transferAmount > data.summary?.totalExpenses * 0.5) {
    issues.push('Too many UPI transfers detected - possible internal transfer pollution');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}
