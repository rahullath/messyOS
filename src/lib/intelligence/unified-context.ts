// src/lib/intelligence/unified-context.ts - Unified Data Fetching Layer
// Eliminates redundant Supabase queries and provides cached, efficient user context

import { createServerAuth } from '../auth/simple-multi-user';
import type { Database } from '../../types/supabase';

export interface UnifiedUserContext {
  userId: string;
  profile: {
    email: string;
    preferences: any;
    subscription_status: string;
    trial_end_date?: string;
    created_at: string;
  };
  tasks: {
    active: any[];
    completed: any[];
    high_priority: any[];
    overdue: any[];
    total_count: number;
    completion_rate: number;
  };
  habits: {
    active: any[];
    entries: any[];
    streaks: { [habitId: string]: number };
    completion_rate: number;
    total_count: number;
  };
  health: {
    recent_metrics: any[];
    sleep: any[];
    mood: any[];
    energy: any[];
    summary: {
      avg_sleep: number;
      avg_mood: number;
      avg_energy: number;
      last_recorded: string;
    };
  };
  finance: {
    recent_expenses: any[];
    income: any[];
    summary: {
      total_spent_30d: number;
      avg_daily_spend: number;
      last_recorded: string;
    };
  };
  ai_memory: {
    recent_conversations: any[];
    insights: any[];
    patterns: any[];
    action_history: any[];
  };
  content: {
    recent_entries: any[];
    categories: string[];
    summary: {
      total_count: number;
      last_recorded: string;
    };
  };
  performance_stats: {
    data_completeness: number;
    activity_level: 'low' | 'medium' | 'high';
    consistency_score: number;
  };
  cached_at: string;
  cache_expiry: string;
}

interface CacheEntry {
  data: UnifiedUserContext;
  expiry: number;
}

class UnifiedContextManager {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  // Main method to get user context - uses cache when possible
  async getUserContext(cookies: any, userId: string, forceRefresh = false): Promise<UnifiedUserContext> {
    const cacheKey = `user_context_${userId}`;
    const now = Date.now();

    // Check cache first unless force refresh
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (now < cached.expiry) {
        console.log('📊 Using cached user context for:', userId);
        return cached.data;
      }
    }

    console.log('🔄 Fetching fresh user context for:', userId);
    
    const serverAuth = createServerAuth(cookies);
    const supabase = serverAuth.supabase;

    // Parallel data fetching to minimize latency
    const [
      profileData,
      tasksData,
      habitsData,
      metricsData,
      conversationsData,
      contentData
    ] = await Promise.all([
      this.fetchUserProfile(supabase, userId),
      this.fetchTasksData(supabase, userId),
      this.fetchHabitsData(supabase, userId),
      this.fetchMetricsData(supabase, userId),
      this.fetchAIMemoryData(supabase, userId),
      this.fetchContentData(supabase, userId)
    ]);

    const context: UnifiedUserContext = {
      userId,
      profile: profileData,
      tasks: tasksData,
      habits: habitsData,
      health: metricsData.health,
      finance: metricsData.finance,
      ai_memory: conversationsData,
      content: contentData,
      performance_stats: this.calculatePerformanceStats(tasksData, habitsData, metricsData),
      cached_at: new Date().toISOString(),
      cache_expiry: new Date(now + this.CACHE_DURATION).toISOString()
    };

    // Cache the result
    this.setCacheEntry(cacheKey, context, now + this.CACHE_DURATION);

    return context;
  }

  // Fetch user profile and preferences
  private async fetchUserProfile(supabase: any, userId: string) {
    try {
      const [userResult, preferencesResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single()
      ]);

      const user = userResult.data?.user;
      const preferences = preferencesResult.data;

      return {
        email: user?.email || '',
        preferences: preferences || {},
        subscription_status: preferences?.subscription_status || 'trial',
        trial_end_date: preferences?.trial_end_date,
        created_at: user?.created_at || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return {
        email: '',
        preferences: {},
        subscription_status: 'trial',
        created_at: new Date().toISOString()
      };
    }
  }

  // Fetch and organize tasks data
  private async fetchTasksData(supabase: any, userId: string) {
    try {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);

      const tasksArray = tasks || [];
      const now = new Date();

      const active = tasksArray.filter((t: any) => ['todo', 'in_progress'].includes(t.status));
      const completed = tasksArray.filter((t: any) => t.status === 'completed');
      const high_priority = tasksArray.filter((t: any) => t.priority === 'high' && t.status !== 'completed');
      const overdue = tasksArray.filter((t: any) => 
        t.due_date && 
        new Date(t.due_date) < now && 
        t.status !== 'completed'
      );

      const completion_rate = tasksArray.length > 0 
        ? (completed.length / tasksArray.length) * 100 
        : 0;

      return {
        active,
        completed: completed.slice(0, 50), // Limit completed tasks
        high_priority,
        overdue,
        total_count: tasksArray.length,
        completion_rate: Math.round(completion_rate)
      };
    } catch (error) {
      console.error('Error fetching tasks data:', error);
      return {
        active: [],
        completed: [],
        high_priority: [],
        overdue: [],
        total_count: 0,
        completion_rate: 0
      };
    }
  }

  // Fetch and organize habits data with entries
  private async fetchHabitsData(supabase: any, userId: string) {
    try {
      const { data: habits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      const habitsArray = habits || [];
      
      // Fetch recent entries for all habits in parallel
      const entryPromises = habitsArray.map(async (habit: any) => {
        const { data: entries } = await supabase
          .from('habit_entries')
          .select('*')
          .eq('habit_id', habit.id)
          .order('logged_at', { ascending: false })
          .limit(30);
        
        return { habitId: habit.id, entries: entries || [] };
      });

      const habitEntries = await Promise.all(entryPromises);
      
      // Build entries map and calculate streaks
      const entriesMap: any = {};
      const streaks: { [habitId: string]: number } = {};
      
      habitEntries.forEach(({ habitId, entries }) => {
        entriesMap[habitId] = entries;
        streaks[habitId] = this.calculateStreak(entries);
      });

      // Calculate overall completion rate
      const totalEntries = Object.values(entriesMap).flat().length;
      const expectedEntries = habitsArray.length * 30; // 30 days worth
      const completion_rate = expectedEntries > 0 ? (totalEntries / expectedEntries) * 100 : 0;

      return {
        active: habitsArray,
        entries: Object.values(entriesMap).flat(),
        streaks,
        completion_rate: Math.round(completion_rate),
        total_count: habitsArray.length
      };
    } catch (error) {
      console.error('Error fetching habits data:', error);
      return {
        active: [],
        entries: [],
        streaks: {},
        completion_rate: 0,
        total_count: 0
      };
    }
  }

  // Fetch and organize metrics data
  private async fetchMetricsData(supabase: any, userId: string) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: metrics } = await supabase
        .from('metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('recorded_at', thirtyDaysAgo.toISOString())
        .order('recorded_at', { ascending: false })
        .limit(500);

      const metricsArray = metrics || [];

      // Categorize metrics
      const healthTypes = ['sleep_duration', 'heart_rate_avg', 'stress_level', 'weight', 'steps', 'mood', 'energy_level'];
      const financeTypes = ['expense', 'income', 'crypto_value', 'investment_value'];

      const healthMetrics = metricsArray.filter((m: any) => healthTypes.includes(m.type));
      const financeMetrics = metricsArray.filter((m: any) => financeTypes.includes(m.type));

      // Health summary calculations
      const sleepMetrics = healthMetrics.filter((m: any) => m.type === 'sleep_duration');
      const moodMetrics = healthMetrics.filter((m: any) => m.type === 'mood');
      const energyMetrics = healthMetrics.filter((m: any) => m.type === 'energy_level');

      const healthSummary = {
        avg_sleep: sleepMetrics.length > 0 
          ? sleepMetrics.reduce((sum: number, m: any) => sum + m.value, 0) / sleepMetrics.length 
          : 0,
        avg_mood: moodMetrics.length > 0 
          ? moodMetrics.reduce((sum: number, m: any) => sum + m.value, 0) / moodMetrics.length 
          : 0,
        avg_energy: energyMetrics.length > 0 
          ? energyMetrics.reduce((sum: number, m: any) => sum + m.value, 0) / energyMetrics.length 
          : 0,
        last_recorded: healthMetrics.length > 0 ? healthMetrics[0].recorded_at : ''
      };

      // Finance summary calculations
      const expenses = financeMetrics.filter((m: any) => m.type === 'expense');
      const totalSpent = expenses.reduce((sum: number, m: any) => sum + Math.abs(m.value), 0);

      const financeSummary = {
        total_spent_30d: totalSpent,
        avg_daily_spend: totalSpent / 30,
        last_recorded: financeMetrics.length > 0 ? financeMetrics[0].recorded_at : ''
      };

      return {
        health: {
          recent_metrics: healthMetrics.slice(0, 50),
          sleep: sleepMetrics,
          mood: moodMetrics,
          energy: energyMetrics,
          summary: healthSummary
        },
        finance: {
          recent_expenses: expenses.slice(0, 30),
          income: financeMetrics.filter((m: any) => m.type === 'income'),
          summary: financeSummary
        }
      };
    } catch (error) {
      console.error('Error fetching metrics data:', error);
      return {
        health: {
          recent_metrics: [],
          sleep: [],
          mood: [],
          energy: [],
          summary: { avg_sleep: 0, avg_mood: 0, avg_energy: 0, last_recorded: '' }
        },
        finance: {
          recent_expenses: [],
          income: [],
          summary: { total_spent_30d: 0, avg_daily_spend: 0, last_recorded: '' }
        }
      };
    }
  }

  // Fetch AI memory and conversation data
  private async fetchAIMemoryData(supabase: any, userId: string) {
    try {
      const [conversationsResult, insightsResult, actionsResult] = await Promise.all([
        supabase
          .from('ai_conversations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50),
        
        supabase
          .from('ai_insights')
          .select('*')
          .eq('user_id', userId)
          .eq('is_dismissed', false)
          .order('created_at', { ascending: false })
          .limit(20),
          
        supabase
          .from('ai_actions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      return {
        recent_conversations: conversationsResult.data || [],
        insights: insightsResult.data || [],
        patterns: [], // To be populated by pattern detection
        action_history: actionsResult.data || []
      };
    } catch (error) {
      console.error('Error fetching AI memory data:', error);
      return {
        recent_conversations: [],
        insights: [],
        patterns: [],
        action_history: []
      };
    }
  }

  // Fetch content tracking data
  private async fetchContentData(supabase: any, userId: string) {
    try {
      const { data: content } = await supabase
        .from('content_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      const contentArray = content || [];
      const categories = [...new Set(contentArray.map((c: any) => c.type))];

      return {
        recent_entries: contentArray,
        categories,
        summary: {
          total_count: contentArray.length,
          last_recorded: contentArray.length > 0 ? contentArray[0].created_at : ''
        }
      };
    } catch (error) {
      console.error('Error fetching content data:', error);
      return {
        recent_entries: [],
        categories: [],
        summary: {
          total_count: 0,
          last_recorded: ''
        }
      };
    }
  }

  // Calculate performance statistics
  private calculatePerformanceStats(tasksData: any, habitsData: any, metricsData: any) {
    // Data completeness based on recent activity
    const hasRecentTasks = tasksData.total_count > 0;
    const hasRecentHabits = habitsData.total_count > 0;
    const hasRecentHealth = metricsData.health.recent_metrics.length > 0;
    const hasRecentFinance = metricsData.finance.recent_expenses.length > 0;

    const completeness = [hasRecentTasks, hasRecentHabits, hasRecentHealth, hasRecentFinance]
      .filter(Boolean).length / 4 * 100;

    // Activity level based on total data points
    const totalDataPoints = tasksData.total_count + habitsData.entries.length + 
                           metricsData.health.recent_metrics.length + 
                           metricsData.finance.recent_expenses.length;

    let activityLevel: 'low' | 'medium' | 'high' = 'low';
    if (totalDataPoints > 100) activityLevel = 'high';
    else if (totalDataPoints > 30) activityLevel = 'medium';

    // Consistency score based on habit and task completion rates
    const consistencyScore = (tasksData.completion_rate + habitsData.completion_rate) / 2;

    return {
      data_completeness: Math.round(completeness),
      activity_level: activityLevel,
      consistency_score: Math.round(consistencyScore)
    };
  }

  // Calculate habit streak
  private calculateStreak(entries: any[]): number {
    if (!entries || entries.length === 0) return 0;

    // Sort entries by date
    const sortedEntries = entries.sort((a, b) => 
      new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
    );

    let streak = 0;
    let currentDate = new Date();
    
    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.logged_at);
      const daysDiff = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak) {
        streak++;
        currentDate = entryDate;
      } else if (daysDiff > streak + 1) {
        break;
      }
    }

    return streak;
  }

  // Cache management
  private setCacheEntry(key: string, data: UnifiedUserContext, expiry: number) {
    // Clean up old entries if cache is getting too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, { data, expiry });
  }

  // Clear cache for specific user
  clearUserCache(userId: string) {
    const cacheKey = `user_context_${userId}`;
    this.cache.delete(cacheKey);
    console.log('🧹 Cleared cache for user:', userId);
  }

  // Clear entire cache
  clearAllCache() {
    this.cache.clear();
    console.log('🧹 Cleared all unified context cache');
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    const validEntries = Array.from(this.cache.values()).filter(entry => now < entry.expiry);
    
    return {
      total_entries: this.cache.size,
      valid_entries: validEntries.length,
      expired_entries: this.cache.size - validEntries.length,
      cache_hit_potential: validEntries.length > 0 ? 'high' : 'low'
    };
  }
}

// Singleton instance
export const unifiedContextManager = new UnifiedContextManager();

// Convenience function for easy import
export async function getUserContext(
  cookies: any, 
  userId: string, 
  forceRefresh = false
): Promise<UnifiedUserContext> {
  return unifiedContextManager.getUserContext(cookies, userId, forceRefresh);
}

// Type exports
export type { CacheEntry };