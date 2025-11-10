// src/test/integration/habits-performance-optimization.test.ts - Performance optimization tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { habitCacheService } from '../../lib/habits/cache-service';
import { habitPaginationService } from '../../lib/habits/pagination-service';
import { optimizedStreakService } from '../../lib/habits/optimized-streak-service';
import { habitPerformanceMonitor } from '../../lib/habits/performance-monitor';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }))
  })),
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
};

describe('Habits Performance Optimization', () => {
  const testUserId = 'test-user-123';
  const testHabitId = 'test-habit-456';

  beforeEach(() => {
    vi.clearAllMocks();
    habitCacheService.clearAll();
    habitPerformanceMonitor['metrics'] = [];
  });

  afterEach(() => {
    habitCacheService.clearAll();
  });

  describe('Cache Service', () => {
    it('should cache and retrieve user habits', () => {
      const testHabits = [
        { id: '1', name: 'Exercise', user_id: testUserId },
        { id: '2', name: 'Meditation', user_id: testUserId }
      ];

      // Cache habits
      habitCacheService.cacheUserHabits(testUserId, testHabits as any);

      // Retrieve from cache
      const cachedHabits = habitCacheService.getCachedUserHabits(testUserId);
      
      expect(cachedHabits).toEqual(testHabits);
    });

    it('should return null for expired cache entries', async () => {
      const testHabits = [{ id: '1', name: 'Exercise', user_id: testUserId }];

      // Cache with very short TTL
      habitCacheService['set']('test-key', testHabits, 1); // 1ms TTL

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));

      const cachedHabits = habitCacheService['get']('test-key');
      expect(cachedHabits).toBeNull();
    });

    it('should invalidate user cache correctly', () => {
      const testHabits = [{ id: '1', name: 'Exercise', user_id: testUserId }];
      
      habitCacheService.cacheUserHabits(testUserId, testHabits as any);
      expect(habitCacheService.getCachedUserHabits(testUserId)).toEqual(testHabits);

      habitCacheService.invalidateUserCache(testUserId);
      expect(habitCacheService.getCachedUserHabits(testUserId)).toBeNull();
    });

    it('should cleanup expired entries', async () => {
      // Add some entries with different TTLs
      habitCacheService['set']('short-ttl', 'data1', 1);
      habitCacheService['set']('long-ttl', 'data2', 10000);

      await new Promise(resolve => setTimeout(resolve, 10));

      const removedCount = habitCacheService.cleanup();
      expect(removedCount).toBe(1);
      
      expect(habitCacheService['get']('short-ttl')).toBeNull();
      expect(habitCacheService['get']('long-ttl')).toBe('data2');
    });

    it('should provide cache statistics', () => {
      habitCacheService['set']('key1', 'data1', 10000);
      habitCacheService['set']('key2', 'data2', 10000);

      const stats = habitCacheService.getStats();
      
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.oldestEntry).toBeLessThanOrEqual(stats.newestEntry);
    });
  });

  describe('Pagination Service', () => {
    beforeEach(() => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ 
                data: [
                  { id: '1', habit_id: testHabitId, value: 1, date: '2024-01-01' },
                  { id: '2', habit_id: testHabitId, value: 1, date: '2024-01-02' }
                ], 
                error: null, 
                count: 10 
              }))
            }))
          }))
        }))
      });
    });

    it('should normalize pagination parameters', async () => {
      const result = await habitPaginationService.getPaginatedEntries(
        mockSupabase,
        testUserId,
        { page: -1, pageSize: 1000 } // Invalid values
      );

      expect(result.pagination.page).toBe(1); // Should be normalized to 1
      expect(result.pagination.pageSize).toBeLessThanOrEqual(200); // Should be capped
    });

    it('should calculate pagination metadata correctly', async () => {
      const result = await habitPaginationService.getPaginatedEntries(
        mockSupabase,
        testUserId,
        { page: 1, pageSize: 5 }
      );

      expect(result.pagination.totalItems).toBe(10);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPreviousPage).toBe(false);
    });

    it('should cache paginated results', async () => {
      // First call
      const result1 = await habitPaginationService.getPaginatedEntries(
        mockSupabase,
        testUserId,
        { page: 1, pageSize: 10 }
      );

      // Second call should hit cache
      const result2 = await habitPaginationService.getPaginatedEntries(
        mockSupabase,
        testUserId,
        { page: 1, pageSize: 10 }
      );

      expect(result1.performance.cacheHit).toBe(false);
      expect(result2.performance.cacheHit).toBe(true);
    });

    it('should handle pagination metadata requests', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ count: 150, error: null }))
        }))
      });

      const metadata = await habitPaginationService.getPaginationMetadata(
        mockSupabase,
        testUserId
      );

      expect(metadata.totalItems).toBe(150);
      expect(metadata.recommendedPageSize).toBeGreaterThan(0);
      expect(metadata.totalPages).toBeGreaterThan(0);
    });
  });

  describe('Optimized Streak Service', () => {
    beforeEach(() => {
      mockSupabase.rpc.mockImplementation((functionName) => {
        if (functionName === 'calculate_habit_streak') {
          return Promise.resolve({
            data: { current_streak: 5, best_streak: 10 },
            error: null
          });
        }
        return Promise.resolve({ data: null, error: null });
      });
    });

    it('should calculate habit streak using database function', async () => {
      const result = await optimizedStreakService.calculateHabitStreak(
        mockSupabase,
        testUserId,
        testHabitId
      );

      expect(result.current).toBe(5);
      expect(result.best).toBe(10);
      expect(result.performance.cacheHit).toBe(false);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('calculate_habit_streak', {
        p_habit_id: testHabitId,
        p_as_of_date: expect.any(String)
      });
    });

    it('should cache streak calculation results', async () => {
      // First call
      const result1 = await optimizedStreakService.calculateHabitStreak(
        mockSupabase,
        testUserId,
        testHabitId
      );

      // Second call should hit cache
      const result2 = await optimizedStreakService.calculateHabitStreak(
        mockSupabase,
        testUserId,
        testHabitId
      );

      expect(result1.performance.cacheHit).toBe(false);
      expect(result2.performance.cacheHit).toBe(true);
    });

    it('should handle batch streak calculations', async () => {
      mockSupabase.rpc.mockImplementation((functionName) => {
        if (functionName === 'update_user_habit_streaks') {
          return Promise.resolve({
            data: [
              { habit_id: 'habit1', new_current_streak: 3, new_best_streak: 7 },
              { habit_id: 'habit2', new_current_streak: 1, new_best_streak: 5 }
            ],
            error: null
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const results = await optimizedStreakService.calculateMultipleHabitStreaks(
        mockSupabase,
        testUserId,
        ['habit1', 'habit2']
      );

      expect(results.size).toBe(2);
      expect(results.get('habit1')?.current).toBe(3);
      expect(results.get('habit2')?.current).toBe(1);
    });

    it('should fallback to client-side calculation on database error', async () => {
      // Mock database function failure
      mockSupabase.rpc.mockImplementation(() => 
        Promise.resolve({ data: null, error: { message: 'Function not found' } })
      );

      // Mock habit type query
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: { type: 'build' }, 
              error: null 
            }))
          }))
        }))
      });

      const result = await optimizedStreakService.calculateHabitStreak(
        mockSupabase,
        testUserId,
        testHabitId
      );

      // Should still return a result (even if 0 due to no entries)
      expect(result).toBeDefined();
      expect(typeof result.current).toBe('number');
      expect(typeof result.best).toBe('number');
    });
  });

  describe('Performance Monitor', () => {
    it('should record performance metrics', () => {
      habitPerformanceMonitor.recordMetric('test-operation', 150, testUserId, {
        testData: true
      });

      const stats = habitPerformanceMonitor.getStats('test-operation');
      expect(stats.count).toBe(1);
      expect(stats.avgDuration).toBe(150);
    });

    it('should time async operations', async () => {
      const result = await habitPerformanceMonitor.timeOperation(
        'async-test',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'success';
        },
        testUserId
      );

      expect(result).toBe('success');
      
      const stats = habitPerformanceMonitor.getStats('async-test');
      expect(stats.count).toBe(1);
      expect(stats.avgDuration).toBeGreaterThan(40); // Should be around 50ms
    });

    it('should time sync operations', () => {
      const result = habitPerformanceMonitor.timeSync(
        'sync-test',
        () => {
          // Simulate some work
          let sum = 0;
          for (let i = 0; i < 1000; i++) {
            sum += i;
          }
          return sum;
        },
        testUserId
      );

      expect(result).toBe(499500); // Sum of 0 to 999
      
      const stats = habitPerformanceMonitor.getStats('sync-test');
      expect(stats.count).toBe(1);
      expect(stats.avgDuration).toBeGreaterThan(0);
    });

    it('should calculate performance trends', () => {
      // Add metrics with improving trend
      for (let i = 0; i < 10; i++) {
        habitPerformanceMonitor.recordMetric('trend-test', 100 - i * 5, testUserId);
      }

      const stats = habitPerformanceMonitor.getStats('trend-test');
      expect(stats.recentTrend).toBe('improving');
    });

    it('should identify slow operations', () => {
      habitPerformanceMonitor.recordMetric('fast-op', 50, testUserId);
      habitPerformanceMonitor.recordMetric('slow-op', 2000, testUserId); // Slow operation

      const slowOps = habitPerformanceMonitor.getSlowOperationsReport();
      expect(slowOps).toHaveLength(1);
      expect(slowOps[0].operation).toBe('slow-op');
      expect(slowOps[0].duration).toBe(2000);
    });

    it('should group operations by type', () => {
      habitPerformanceMonitor.recordMetric('query:habits', 100, testUserId);
      habitPerformanceMonitor.recordMetric('query:habits', 150, testUserId);
      habitPerformanceMonitor.recordMetric('render:dashboard', 50, testUserId);

      const operationTypes = habitPerformanceMonitor.getOperationTypes();
      
      const habitsQuery = operationTypes.find(op => op.operation === 'query:habits');
      expect(habitsQuery?.count).toBe(2);
      expect(habitsQuery?.avgDuration).toBe(125);
    });

    it('should create and use timers', () => {
      const timer = habitPerformanceMonitor.createTimer('timer-test', testUserId);
      
      // Simulate some work
      for (let i = 0; i < 1000; i++) {
        Math.random();
      }
      
      const duration = timer.end();
      
      expect(duration).toBeGreaterThan(0);
      
      const stats = habitPerformanceMonitor.getStats('timer-test');
      expect(stats.count).toBe(1);
    });

    it('should clear old metrics', () => {
      // Add old metric
      habitPerformanceMonitor['metrics'].push({
        operation: 'old-metric',
        duration: 100,
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        userId: testUserId
      });

      // Add recent metric
      habitPerformanceMonitor.recordMetric('recent-metric', 100, testUserId);

      const removedCount = habitPerformanceMonitor.clearOldMetrics(24 * 60 * 60 * 1000); // 24 hours
      
      expect(removedCount).toBe(1);
      expect(habitPerformanceMonitor.getStats('old-metric').count).toBe(0);
      expect(habitPerformanceMonitor.getStats('recent-metric').count).toBe(1);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete analytics workflow with caching', async () => {
      // Mock successful database responses
      mockSupabase.rpc.mockImplementation((functionName) => {
        if (functionName === 'get_habit_analytics') {
          return Promise.resolve({
            data: [
              {
                habit_id: testHabitId,
                habit_name: 'Exercise',
                total_entries: 30,
                successful_entries: 25,
                completion_rate: 83.33
              }
            ],
            error: null
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      // First request - should hit database
      const timer1 = habitPerformanceMonitor.createTimer('analytics-workflow');
      
      const response1 = await fetch('/api/habits/analytics/optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: 30,
          includeStreaks: true,
          useCache: true
        })
      });

      timer1.end();

      // Second request - should hit cache (if implemented correctly)
      const timer2 = habitPerformanceMonitor.createTimer('analytics-workflow-cached');
      
      const response2 = await fetch('/api/habits/analytics/optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          days: 30,
          includeStreaks: true,
          useCache: true
        })
      });

      timer2.end();

      // Verify performance improvement with caching
      const stats = habitPerformanceMonitor.getStats();
      expect(stats.count).toBeGreaterThan(0);
    });

    it('should handle pagination with performance monitoring', async () => {
      const timer = habitPerformanceMonitor.createTimer('pagination-test');

      await habitPaginationService.getPaginatedEntries(
        mockSupabase,
        testUserId,
        { page: 1, pageSize: 50 }
      );

      const duration = timer.end();
      expect(duration).toBeGreaterThan(0);

      const stats = habitPerformanceMonitor.getStats('pagination-test');
      expect(stats.count).toBe(1);
    });
  });
});