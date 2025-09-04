// src/lib/habits/optimized-streak-service.ts - Optimized streak calculation service
import type { Database } from '../../types/supabase';
import { habitCacheService } from './cache-service';
import { habitPaginationService } from './pagination-service';

type HabitData = Database['public']['Tables']['habits']['Row'];
type HabitEntry = Database['public']['Tables']['habit_entries']['Row'];

export interface StreakData {
  habitId: string;
  currentStreak: number;
  bestStreak: number;
  streakType: 'build' | 'break' | 'maintain';
  lastUpdated: string;
  streakHistory: {
    date: string;
    streakLength: number;
    isActive: boolean;
  }[];
}

export interface StreakCalculationResult {
  current: number;
  best: number;
  history: Array<{
    startDate: string;
    endDate: string;
    length: number;
    isActive: boolean;
  }>;
  performance: {
    calculationTime: number;
    entriesProcessed: number;
    cacheHit: boolean;
  };
}

class OptimizedStreakService {
  /**
   * Calculate streak for a single habit using optimized algorithm
   */
  async calculateHabitStreak(
    supabaseClient: any,
    userId: string,
    habitId: string,
    asOfDate: string = new Date().toISOString().split('T')[0]
  ): Promise<StreakCalculationResult> {
    const startTime = Date.now();
    const cacheKey = `streak:${habitId}:${asOfDate}`;

    // Check cache first
    const cachedResult = habitCacheService.get<StreakCalculationResult>(cacheKey);
    if (cachedResult) {
      return {
        ...cachedResult,
        performance: {
          ...cachedResult.performance,
          cacheHit: true
        }
      };
    }

    try {
      // Get habit type to determine success criteria
      const { data: habit, error: habitError } = await supabaseClient
        .from('habits')
        .select('type')
        .eq('id', habitId)
        .single();

      if (habitError || !habit) {
        throw new Error(`Failed to fetch habit: ${habitError?.message}`);
      }

      // Use database function for optimal performance
      const { data: streakResult, error: streakError } = await supabaseClient
        .rpc('calculate_habit_streak', {
          p_habit_id: habitId,
          p_as_of_date: asOfDate
        });

      if (streakError) {
        // Fallback to client-side calculation if database function fails
        console.warn('Database streak calculation failed, falling back to client-side:', streakError);
        return await this.calculateStreakClientSide(supabaseClient, userId, habitId, habit.type, asOfDate);
      }

      const result: StreakCalculationResult = {
        current: streakResult.current_streak || 0,
        best: streakResult.best_streak || 0,
        history: [], // Would need additional query for detailed history
        performance: {
          calculationTime: Date.now() - startTime,
          entriesProcessed: 0, // Database function handles this internally
          cacheHit: false
        }
      };

      // Cache result for 1 hour
      habitCacheService.set(cacheKey, result, 60 * 60 * 1000);

      return result;

    } catch (error) {
      console.error('Streak calculation failed:', error);
      throw error;
    }
  }

  /**
   * Client-side streak calculation as fallback
   */
  private async calculateStreakClientSide(
    supabaseClient: any,
    userId: string,
    habitId: string,
    habitType: string,
    asOfDate: string
  ): Promise<StreakCalculationResult> {
    const startTime = Date.now();

    // Get entries for the last year (performance optimization)
    const entries = await habitPaginationService.getStreakCalculationData(
      supabaseClient,
      userId,
      habitId,
      365
    );

    const entriesProcessed = entries.length;

    // Sort entries by date (ascending for streak calculation)
    const sortedEntries = entries.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Determine success criteria based on habit type
    const isSuccess = (value: number | null): boolean => {
      if (habitType === 'break') {
        return value === 0 || value === null;
      }
      return (value || 0) > 0;
    };

    // Calculate streaks
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;
    const streakHistory: Array<{
      startDate: string;
      endDate: string;
      length: number;
      isActive: boolean;
    }> = [];

    let streakStart: string | null = null;
    let lastDate: string | null = null;

    // Process entries to find streaks
    for (let i = 0; i < sortedEntries.length; i++) {
      const entry = sortedEntries[i];
      const success = isSuccess(entry.value);
      const currentDate = entry.date;

      if (success) {
        if (tempStreak === 0) {
          streakStart = currentDate;
        }
        tempStreak++;
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        if (tempStreak > 0 && streakStart) {
          streakHistory.push({
            startDate: streakStart,
            endDate: lastDate || streakStart,
            length: tempStreak,
            isActive: false
          });
        }
        tempStreak = 0;
        streakStart = null;
      }

      lastDate = currentDate;
    }

    // Handle ongoing streak
    if (tempStreak > 0 && streakStart) {
      const isOngoing = lastDate === asOfDate || 
        (lastDate && new Date(asOfDate).getTime() - new Date(lastDate).getTime() <= 24 * 60 * 60 * 1000);
      
      streakHistory.push({
        startDate: streakStart,
        endDate: lastDate || streakStart,
        length: tempStreak,
        isActive: isOngoing
      });

      if (isOngoing) {
        currentStreak = tempStreak;
      }
    }

    const result: StreakCalculationResult = {
      current: currentStreak,
      best: bestStreak,
      history: streakHistory,
      performance: {
        calculationTime: Date.now() - startTime,
        entriesProcessed,
        cacheHit: false
      }
    };

    return result;
  }

  /**
   * Batch calculate streaks for multiple habits
   */
  async calculateMultipleHabitStreaks(
    supabaseClient: any,
    userId: string,
    habitIds: string[]
  ): Promise<Map<string, StreakCalculationResult>> {
    const results = new Map<string, StreakCalculationResult>();
    
    // Use database function for batch calculation if available
    try {
      const { data: batchResult, error } = await supabaseClient
        .rpc('update_user_habit_streaks', {
          p_user_id: userId
        });

      if (!error && batchResult) {
        // Convert batch result to individual streak results
        for (const result of batchResult) {
          if (habitIds.includes(result.habit_id)) {
            results.set(result.habit_id, {
              current: result.new_current_streak,
              best: result.new_best_streak,
              history: [],
              performance: {
                calculationTime: 0, // Batch operation
                entriesProcessed: 0,
                cacheHit: false
              }
            });
          }
        }
        return results;
      }
    } catch (error) {
      console.warn('Batch streak calculation failed, falling back to individual calculations:', error);
    }

    // Fallback to individual calculations
    const promises = habitIds.map(async (habitId) => {
      try {
        const result = await this.calculateHabitStreak(supabaseClient, userId, habitId);
        return [habitId, result] as const;
      } catch (error) {
        console.error(`Failed to calculate streak for habit ${habitId}:`, error);
        return [habitId, {
          current: 0,
          best: 0,
          history: [],
          performance: {
            calculationTime: 0,
            entriesProcessed: 0,
            cacheHit: false
          }
        }] as const;
      }
    });

    const resolvedResults = await Promise.all(promises);
    resolvedResults.forEach(([habitId, result]) => {
      results.set(habitId, result);
    });

    return results;
  }

  /**
   * Update habit streak in database
   */
  async updateHabitStreak(
    supabaseClient: any,
    habitId: string,
    streakData: { current: number; best: number }
  ): Promise<void> {
    try {
      const { error } = await supabaseClient
        .from('habits')
        .update({
          streak_count: streakData.current,
          best_streak: Math.max(streakData.best, streakData.current),
          updated_at: new Date().toISOString()
        })
        .eq('id', habitId);

      if (error) {
        throw new Error(`Failed to update habit streak: ${error.message}`);
      }

      // Invalidate cache for this habit
      habitCacheService.invalidateHabitCache('', habitId);

    } catch (error) {
      console.error('Failed to update habit streak:', error);
      throw error;
    }
  }

  /**
   * Get streak trends for analytics
   */
  async getStreakTrends(
    supabaseClient: any,
    userId: string,
    habitId: string,
    days: number = 90
  ): Promise<{
    daily: Array<{ date: string; streak: number }>;
    weekly: Array<{ week: string; avgStreak: number; maxStreak: number }>;
    monthly: Array<{ month: string; avgStreak: number; maxStreak: number }>;
  }> {
    const cacheKey = `streak_trends:${habitId}:${days}d`;
    
    // Check cache first
    const cachedTrends = habitCacheService.get<any>(cacheKey);
    if (cachedTrends) {
      return cachedTrends;
    }

    try {
      const entries = await habitPaginationService.getStreakCalculationData(
        supabaseClient,
        userId,
        habitId,
        days
      );

      // Get habit type
      const { data: habit } = await supabaseClient
        .from('habits')
        .select('type')
        .eq('id', habitId)
        .single();

      const habitType = habit?.type || 'build';
      const isSuccess = (value: number | null): boolean => {
        if (habitType === 'break') {
          return value === 0 || value === null;
        }
        return (value || 0) > 0;
      };

      // Calculate daily streaks
      const daily: Array<{ date: string; streak: number }> = [];
      let currentStreak = 0;

      const sortedEntries = entries.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      for (const entry of sortedEntries) {
        if (isSuccess(entry.value)) {
          currentStreak++;
        } else {
          currentStreak = 0;
        }
        daily.push({ date: entry.date, streak: currentStreak });
      }

      // Calculate weekly aggregates
      const weeklyMap = new Map<string, { streaks: number[]; max: number }>();
      daily.forEach(({ date, streak }) => {
        const weekStart = this.getWeekStart(new Date(date));
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyMap.has(weekKey)) {
          weeklyMap.set(weekKey, { streaks: [], max: 0 });
        }
        
        const weekData = weeklyMap.get(weekKey)!;
        weekData.streaks.push(streak);
        weekData.max = Math.max(weekData.max, streak);
      });

      const weekly = Array.from(weeklyMap.entries()).map(([week, data]) => ({
        week,
        avgStreak: Math.round(data.streaks.reduce((a, b) => a + b, 0) / data.streaks.length),
        maxStreak: data.max
      }));

      // Calculate monthly aggregates
      const monthlyMap = new Map<string, { streaks: number[]; max: number }>();
      daily.forEach(({ date, streak }) => {
        const monthKey = date.substring(0, 7); // YYYY-MM
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { streaks: [], max: 0 });
        }
        
        const monthData = monthlyMap.get(monthKey)!;
        monthData.streaks.push(streak);
        monthData.max = Math.max(monthData.max, streak);
      });

      const monthly = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        avgStreak: Math.round(data.streaks.reduce((a, b) => a + b, 0) / data.streaks.length),
        maxStreak: data.max
      }));

      const trends = { daily, weekly, monthly };
      
      // Cache for 30 minutes
      habitCacheService.set(cacheKey, trends, 30 * 60 * 1000);

      return trends;

    } catch (error) {
      console.error('Failed to get streak trends:', error);
      throw error;
    }
  }

  /**
   * Get week start date (Monday)
   */
  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  /**
   * Invalidate streak cache for habit
   */
  invalidateStreakCache(habitId: string): void {
    // Remove all cache entries related to this habit's streaks
    const keysToDelete: string[] = [];
    
    for (const [key] of habitCacheService['cache']) {
      if (key.includes(`streak:${habitId}`) || key.includes(`streak_trends:${habitId}`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => habitCacheService['cache'].delete(key));
  }

  /**
   * Precompute streaks for active habits (background task)
   */
  async precomputeUserStreaks(
    supabaseClient: any,
    userId: string
  ): Promise<void> {
    try {
      // Get all active habits for user
      const { data: habits } = await supabaseClient
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!habits?.length) return;

      // Calculate streaks for all habits
      const habitIds = habits.map(h => h.id);
      await this.calculateMultipleHabitStreaks(supabaseClient, userId, habitIds);

    } catch (error) {
      console.error('Failed to precompute user streaks:', error);
    }
  }
}

export const optimizedStreakService = new OptimizedStreakService();
export default optimizedStreakService;