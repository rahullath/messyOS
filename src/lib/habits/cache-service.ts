// src/lib/habits/cache-service.ts - Caching service for habit data
import type { Database } from '../../types/supabase';

type HabitData = Database['public']['Tables']['habits']['Row'];
type HabitEntry = Database['public']['Tables']['habit_entries']['Row'];

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface HabitAnalytics {
  habit_id: string;
  habit_name: string;
  total_entries: number;
  successful_entries: number;
  completion_rate: number;
  avg_effort?: number;
  avg_mood?: number;
  avg_energy?: number;
  best_locations?: string[];
  best_weather?: string[];
  optimal_times?: string[];
  success_tags?: string[];
}

interface DailySummary {
  user_id: string;
  date: string;
  total_habits_logged: number;
  completed_habits: number;
  completion_rate: number;
  avg_effort?: number;
  avg_mood?: number;
  avg_energy?: number;
  locations?: string[];
  all_tags?: string[];
}

class HabitCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly ANALYTICS_TTL = 15 * 60 * 1000; // 15 minutes
  private readonly DAILY_SUMMARY_TTL = 60 * 60 * 1000; // 1 hour

  /**
   * Generate cache key for user habits
   */
  private getUserHabitsKey(userId: string, activeOnly: boolean = true): string {
    return `habits:${userId}:active:${activeOnly}`;
  }

  /**
   * Generate cache key for habit entries
   */
  private getHabitEntriesKey(
    userId: string, 
    habitId?: string, 
    days?: number
  ): string {
    const parts = ['entries', userId];
    if (habitId) parts.push(habitId);
    if (days) parts.push(`${days}d`);
    return parts.join(':');
  }

  /**
   * Generate cache key for analytics data
   */
  private getAnalyticsKey(
    userId: string, 
    days: number = 30, 
    habitIds?: string[]
  ): string {
    const parts = ['analytics', userId, `${days}d`];
    if (habitIds?.length) {
      parts.push(habitIds.sort().join(','));
    }
    return parts.join(':');
  }

  /**
   * Generate cache key for daily summary
   */
  private getDailySummaryKey(userId: string, date: string): string {
    return `daily_summary:${userId}:${date}`;
  }

  /**
   * Check if cache entry is valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get data from cache
   */
  private get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry || !this.isValid(entry)) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Set data in cache
   */
  private set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Cache user habits
   */
  cacheUserHabits(userId: string, habits: HabitData[], activeOnly: boolean = true): void {
    const key = this.getUserHabitsKey(userId, activeOnly);
    this.set(key, habits, this.DEFAULT_TTL);
  }

  /**
   * Get cached user habits
   */
  getCachedUserHabits(userId: string, activeOnly: boolean = true): HabitData[] | null {
    const key = this.getUserHabitsKey(userId, activeOnly);
    return this.get<HabitData[]>(key);
  }

  /**
   * Cache habit entries
   */
  cacheHabitEntries(
    userId: string, 
    entries: HabitEntry[], 
    habitId?: string, 
    days?: number
  ): void {
    const key = this.getHabitEntriesKey(userId, habitId, days);
    this.set(key, entries, this.DEFAULT_TTL);
  }

  /**
   * Get cached habit entries
   */
  getCachedHabitEntries(
    userId: string, 
    habitId?: string, 
    days?: number
  ): HabitEntry[] | null {
    const key = this.getHabitEntriesKey(userId, habitId, days);
    return this.get<HabitEntry[]>(key);
  }

  /**
   * Cache analytics data
   */
  cacheAnalytics(
    userId: string, 
    analytics: HabitAnalytics[], 
    days: number = 30, 
    habitIds?: string[]
  ): void {
    const key = this.getAnalyticsKey(userId, days, habitIds);
    this.set(key, analytics, this.ANALYTICS_TTL);
  }

  /**
   * Get cached analytics data
   */
  getCachedAnalytics(
    userId: string, 
    days: number = 30, 
    habitIds?: string[]
  ): HabitAnalytics[] | null {
    const key = this.getAnalyticsKey(userId, days, habitIds);
    return this.get<HabitAnalytics[]>(key);
  }

  /**
   * Cache daily summary
   */
  cacheDailySummary(userId: string, date: string, summary: DailySummary): void {
    const key = this.getDailySummaryKey(userId, date);
    this.set(key, summary, this.DAILY_SUMMARY_TTL);
  }

  /**
   * Get cached daily summary
   */
  getCachedDailySummary(userId: string, date: string): DailySummary | null {
    const key = this.getDailySummaryKey(userId, date);
    return this.get<DailySummary>(key);
  }

  /**
   * Invalidate user-specific cache entries
   */
  invalidateUserCache(userId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate habit-specific cache entries
   */
  invalidateHabitCache(userId: string, habitId: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache) {
      if (key.includes(userId) && (key.includes(habitId) || key.includes('habits:'))) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    totalSize: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const now = Date.now();
    let totalSize = 0;
    let oldestTimestamp = now;
    let newestTimestamp = 0;

    for (const [key, entry] of this.cache) {
      totalSize += JSON.stringify(entry.data).length;
      oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
      newestTimestamp = Math.max(newestTimestamp, entry.timestamp);
    }

    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      oldestEntry: oldestTimestamp,
      newestEntry: newestTimestamp
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let removedCount = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (!this.isValid(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      removedCount++;
    });

    return removedCount;
  }

  /**
   * Preload frequently accessed data
   */
  async preloadUserData(
    userId: string, 
    supabaseClient: any
  ): Promise<void> {
    try {
      // Preload user habits
      const { data: habits } = await supabaseClient
        .from('habits')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (habits) {
        this.cacheUserHabits(userId, habits);
      }

      // Preload recent entries (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: entries } = await supabaseClient
        .from('habit_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (entries) {
        this.cacheHabitEntries(userId, entries, undefined, 30);
      }

      // Preload today's daily summary
      const today = new Date().toISOString().split('T')[0];
      const { data: dailySummary } = await supabaseClient
        .from('habit_daily_summary')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

      if (dailySummary) {
        this.cacheDailySummary(userId, today, dailySummary);
      }

    } catch (error) {
      console.warn('Failed to preload user data:', error);
    }
  }
}

// Create singleton instance
export const habitCacheService = new HabitCacheService();

// Auto-cleanup every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    const removedCount = habitCacheService.cleanup();
    if (removedCount > 0) {
      console.debug(`Cleaned up ${removedCount} expired cache entries`);
    }
  }, 10 * 60 * 1000);
}

export default habitCacheService;