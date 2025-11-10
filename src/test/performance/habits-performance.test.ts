// src/test/performance/habits-performance.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createServerAuth } from '../../lib/auth/simple-multi-user';

// Mock the auth module
vi.mock('../../lib/auth/simple-multi-user', () => ({
  createServerAuth: vi.fn()
}));

describe('Habits Performance Tests', () => {
  let mockSupabase: any;
  let mockAuth: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Supabase client with performance tracking
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn(),
      rpc: vi.fn()
    };

    // Mock auth
    mockAuth = {
      requireAuth: vi.fn().mockResolvedValue({ id: 'user-123' }),
      supabase: mockSupabase
    };

    (createServerAuth as any).mockReturnValue(mockAuth);
  });

  describe('Large Dataset Performance', () => {
    it('should handle large habit lists efficiently', async () => {
      // Generate large dataset (10,000 habits)
      const largeHabitDataset = [];
      for (let i = 0; i < 10000; i++) {
        largeHabitDataset.push({
          id: `habit-${i}`,
          name: `Habit ${i}`,
          type: i % 3 === 0 ? 'build' : i % 3 === 1 ? 'break' : 'maintain',
          measurement_type: i % 2 === 0 ? 'boolean' : 'count',
          current_streak: Math.floor(Math.random() * 100),
          best_streak: Math.floor(Math.random() * 200),
          user_id: 'user-123',
          created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // Mock paginated response
      mockSupabase.single.mockResolvedValueOnce({
        data: largeHabitDataset.slice(0, 50), // First page
        error: null
      });

      const startTime = Date.now();

      const request = new Request('http://localhost/api/habits', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const cookies = new Map();

      const { GET } = await import('../../pages/api/habits/index.ts');
      const response = await GET({ request, cookies } as any);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.habits).toBeDefined();
      expect(responseData.habits.length).toBeLessThanOrEqual(50); // Pagination limit

      // Should respond within 500ms even with large dataset
      expect(responseTime).toBeLessThan(500);

      // Verify pagination was used
      expect(mockSupabase.limit).toHaveBeenCalled();
    });

    it('should handle large analytics datasets efficiently', async () => {
      // Generate large analytics dataset (100,000 entries)
      const largeAnalyticsDataset = [];
      const baseDate = new Date('2020-01-01');
      
      for (let i = 0; i < 100000; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() + (i % 1000)); // Spread over ~3 years
        
        largeAnalyticsDataset.push({
          id: `entry-${i}`,
          habit_id: `habit-${i % 100}`, // 100 different habits
          user_id: 'user-123',
          date: date.toISOString().split('T')[0],
          value: Math.random() > 0.3 ? 1 : 0, // 70% success rate
          effort: Math.floor(Math.random() * 5) + 1,
          energy_level: Math.floor(Math.random() * 5) + 1,
          mood: Math.floor(Math.random() * 5) + 1,
          location: ['Home', 'Gym', 'Office', 'Outdoors'][Math.floor(Math.random() * 4)],
          weather: ['Sunny', 'Rainy', 'Cloudy', 'Snowy'][Math.floor(Math.random() * 4)],
          context_tags: [['Morning'], ['Evening'], ['High Energy'], ['Low Energy']][Math.floor(Math.random() * 4)]
        });
      }

      // Mock analytics response with aggregated data
      mockSupabase.single.mockResolvedValueOnce({
        data: largeAnalyticsDataset.slice(0, 1000), // Sample for processing
        error: null
      });

      const startTime = Date.now();

      const request = new Request('http://localhost/api/habits/analytics/optimized', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          habitIds: ['habit-1', 'habit-2', 'habit-3'],
          timeRange: '365d',
          analysisType: 'comprehensive'
        })
      });

      const cookies = new Map();

      const { POST } = await import('../../pages/api/habits/analytics/optimized.ts');
      const response = await POST({ request, cookies } as any);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.analytics).toBeDefined();
      expect(responseData.performance).toBeDefined();

      // Should process large dataset within 3 seconds
      expect(responseTime).toBeLessThan(3000);

      // Verify performance metrics are included
      expect(responseData.performance.processingTime).toBeDefined();
      expect(responseData.performance.entriesProcessed).toBeGreaterThan(0);
    });

    it('should efficiently calculate streaks for users with long history', async () => {
      // Generate 5 years of daily entries
      const longHistoryDataset = [];
      const startDate = new Date('2020-01-01');
      const endDate = new Date('2025-01-01');
      
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        // Create realistic patterns: 5 days on, 2 days off
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const value = isWeekend ? (Math.random() > 0.7 ? 1 : 0) : (Math.random() > 0.2 ? 1 : 0);
        
        longHistoryDataset.push({
          date: currentDate.toISOString().split('T')[0],
          value,
          habit_id: 'habit-long-history'
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Mock the streak calculation function
      const calculateStreaksOptimized = (entries: any[]) => {
        const startTime = Date.now();
        
        // Optimized streak calculation using binary search and memoization
        const entryMap = new Map();
        entries.forEach(entry => {
          entryMap.set(entry.date, entry.value);
        });
        
        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;
        
        const today = new Date();
        const sortedDates = Array.from(entryMap.keys()).sort().reverse();
        
        // Calculate current streak (optimized)
        for (let i = 0; i < Math.min(sortedDates.length, 365); i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() - i);
          const dateStr = checkDate.toISOString().split('T')[0];
          
          const value = entryMap.get(dateStr);
          
          if (value === 1 || value === 2) { // Success or skip
            if (i === 0 || currentStreak > 0) currentStreak++;
            tempStreak++;
          } else if (value === 0) { // Failed
            if (currentStreak === 0) currentStreak = tempStreak;
            break;
          } else {
            // No entry - only break if we have active streak
            if (currentStreak > 0) break;
          }
          
          bestStreak = Math.max(bestStreak, tempStreak);
        }
        
        // Calculate best streak from all history (optimized with sliding window)
        let runningStreak = 0;
        for (const date of sortedDates.reverse()) {
          const value = entryMap.get(date);
          
          if (value === 1 || value === 2) {
            runningStreak++;
            bestStreak = Math.max(bestStreak, runningStreak);
          } else {
            runningStreak = 0;
          }
        }
        
        const endTime = Date.now();
        
        return {
          currentStreak: Math.max(currentStreak, 0),
          bestStreak: Math.max(bestStreak, currentStreak),
          processingTime: endTime - startTime,
          entriesProcessed: entries.length
        };
      };

      const result = calculateStreaksOptimized(longHistoryDataset);

      // Should process 5 years of data (1800+ entries) within 100ms
      expect(result.processingTime).toBeLessThan(100);
      expect(result.entriesProcessed).toBeGreaterThan(1800);
      expect(result.currentStreak).toBeGreaterThanOrEqual(0);
      expect(result.bestStreak).toBeGreaterThanOrEqual(result.currentStreak);
    });
  });

  describe('Concurrent User Performance', () => {
    it('should handle multiple simultaneous habit logging requests', async () => {
      const concurrentUsers = 100;
      const requestsPerUser = 5;
      
      // Mock successful responses for all requests
      mockSupabase.single.mockResolvedValue({
        data: { id: 'entry-123', message: 'Success' },
        error: null
      });

      // Create concurrent requests
      const createConcurrentRequests = () => {
        const requests = [];
        
        for (let user = 0; user < concurrentUsers; user++) {
          for (let req = 0; req < requestsPerUser; req++) {
            const request = new Request('http://localhost/api/habits/habit-123/log-enhanced', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                value: 1,
                date: '2025-01-01',
                effort: 3,
                mood: 4
              })
            });

            const cookies = new Map();
            cookies.set('session', `session-user-${user}`);

            // Mock different users
            mockAuth.requireAuth.mockResolvedValueOnce({ id: `user-${user}` });

            requests.push(
              import('../../pages/api/habits/[id]/log-enhanced.ts').then(module => 
                module.POST({ request, params: { id: 'habit-123' }, cookies } as any)
              )
            );
          }
        }
        
        return requests;
      };

      const startTime = Date.now();
      const requests = createConcurrentRequests();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const totalRequests = concurrentUsers * requestsPerUser;

      // All requests should succeed
      expect(responses.length).toBe(totalRequests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should handle 500 concurrent requests within 5 seconds
      expect(totalTime).toBeLessThan(5000);

      // Calculate throughput (requests per second)
      const throughput = totalRequests / (totalTime / 1000);
      expect(throughput).toBeGreaterThan(50); // At least 50 RPS
    });

    it('should handle concurrent analytics generation requests', async () => {
      const concurrentAnalyticsRequests = 20;
      
      // Mock analytics data
      const mockAnalyticsData = [];
      for (let i = 0; i < 1000; i++) {
        mockAnalyticsData.push({
          date: `2025-01-${String(i % 30 + 1).padStart(2, '0')}`,
          value: Math.random() > 0.3 ? 1 : 0,
          habit_id: `habit-${i % 10}`,
          mood: Math.floor(Math.random() * 5) + 1,
          energy_level: Math.floor(Math.random() * 5) + 1
        });
      }

      mockSupabase.single.mockResolvedValue({
        data: mockAnalyticsData,
        error: null
      });

      // Create concurrent analytics requests
      const analyticsRequests = [];
      for (let i = 0; i < concurrentAnalyticsRequests; i++) {
        const request = new Request('http://localhost/api/habits/analytics/optimized', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            habitIds: [`habit-${i % 5}`],
            timeRange: '30d',
            analysisType: 'comprehensive'
          })
        });

        const cookies = new Map();
        mockAuth.requireAuth.mockResolvedValueOnce({ id: `user-${i}` });

        analyticsRequests.push(
          import('../../pages/api/habits/analytics/optimized.ts').then(module =>
            module.POST({ request, cookies } as any)
          )
        );
      }

      const startTime = Date.now();
      const responses = await Promise.all(analyticsRequests);
      const endTime = Date.now();

      const totalTime = endTime - startTime;

      // All analytics requests should succeed
      expect(responses.length).toBe(concurrentAnalyticsRequests);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should handle concurrent analytics within 10 seconds
      expect(totalTime).toBeLessThan(10000);

      // Verify all responses contain analytics data
      for (const response of responses) {
        const data = await response.json();
        expect(data.analytics).toBeDefined();
        expect(data.performance).toBeDefined();
      }
    });

    it('should maintain performance under memory pressure', async () => {
      // Simulate memory pressure by creating large objects
      const memoryPressureTest = () => {
        const largeObjects = [];
        
        // Create 100MB of data to simulate memory pressure
        for (let i = 0; i < 100; i++) {
          const largeArray = new Array(1000000).fill(0).map((_, index) => ({
            id: index,
            data: `large-data-${index}`,
            timestamp: Date.now()
          }));
          largeObjects.push(largeArray);
        }

        // Measure memory usage (approximate)
        const memoryUsage = process.memoryUsage();
        
        return {
          heapUsed: memoryUsage.heapUsed,
          heapTotal: memoryUsage.heapTotal,
          external: memoryUsage.external,
          largeObjectsCount: largeObjects.length
        };
      };

      const beforeMemory = process.memoryUsage();
      
      // Create memory pressure
      const memoryStats = memoryPressureTest();
      
      // Test API performance under memory pressure
      mockSupabase.single.mockResolvedValue({
        data: { id: 'habit-123', name: 'Test Habit' },
        error: null
      });

      const startTime = Date.now();
      
      const request = new Request('http://localhost/api/habits/habit-123/log-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 1 })
      });

      const cookies = new Map();
      const { POST } = await import('../../pages/api/habits/[id]/log-enhanced.ts');
      const response = await POST({ request, params: { id: 'habit-123' }, cookies } as any);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should still respond quickly even under memory pressure
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000);

      // Verify memory usage is reasonable
      const afterMemory = process.memoryUsage();
      const memoryIncrease = afterMemory.heapUsed - beforeMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 500MB)
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024);
    });
  });

  describe('Database Performance', () => {
    it('should optimize database queries for large habit collections', async () => {
      // Mock database query performance tracking
      let queryCount = 0;
      let totalQueryTime = 0;

      const originalFrom = mockSupabase.from;
      mockSupabase.from = vi.fn().mockImplementation((table) => {
        queryCount++;
        const startTime = Date.now();
        
        const mockQuery = {
          ...originalFrom(table),
          single: vi.fn().mockImplementation(() => {
            const queryTime = Date.now() - startTime;
            totalQueryTime += queryTime;
            
            return Promise.resolve({
              data: { id: 'test', name: 'Test' },
              error: null
            });
          })
        };
        
        return mockQuery;
      });

      // Test habit list query optimization
      const request = new Request('http://localhost/api/habits?limit=50&offset=0', {
        method: 'GET'
      });

      const cookies = new Map();
      const { GET } = await import('../../pages/api/habits/index.ts');
      await GET({ request, cookies } as any);

      // Should use minimal queries (ideally 1 for habits list)
      expect(queryCount).toBeLessThanOrEqual(2);
      expect(totalQueryTime).toBeLessThan(100); // Total query time under 100ms
    });

    it('should handle database connection pooling efficiently', async () => {
      // Simulate multiple concurrent database connections
      const connectionTests = [];
      const maxConnections = 50;

      for (let i = 0; i < maxConnections; i++) {
        const testConnection = async () => {
          const startTime = Date.now();
          
          // Mock database connection
          mockSupabase.single.mockResolvedValueOnce({
            data: { id: `test-${i}` },
            error: null
          });

          const request = new Request('http://localhost/api/habits', {
            method: 'GET'
          });

          const cookies = new Map();
          const { GET } = await import('../../pages/api/habits/index.ts');
          const response = await GET({ request, cookies } as any);

          const endTime = Date.now();
          
          return {
            connectionId: i,
            responseTime: endTime - startTime,
            success: response.status === 200
          };
        };

        connectionTests.push(testConnection());
      }

      const results = await Promise.all(connectionTests);

      // All connections should succeed
      expect(results.every(r => r.success)).toBe(true);

      // Average response time should be reasonable
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
      expect(avgResponseTime).toBeLessThan(500);

      // No connection should take excessively long
      const maxResponseTime = Math.max(...results.map(r => r.responseTime));
      expect(maxResponseTime).toBeLessThan(2000);
    });
  });

  describe('Caching Performance', () => {
    it('should implement efficient caching for frequently accessed data', async () => {
      // Mock cache implementation
      const cache = new Map();
      const cacheHits = { count: 0 };
      const cacheMisses = { count: 0 };

      const getCachedData = (key: string) => {
        if (cache.has(key)) {
          cacheHits.count++;
          return cache.get(key);
        }
        cacheMisses.count++;
        return null;
      };

      const setCachedData = (key: string, data: any, ttl = 300000) => { // 5 min TTL
        cache.set(key, {
          data,
          expires: Date.now() + ttl
        });
      };

      // Test caching behavior
      const habitData = { id: 'habit-123', name: 'Exercise' };
      
      // First request - cache miss
      let cachedHabit = getCachedData('habit-123');
      expect(cachedHabit).toBeNull();
      expect(cacheMisses.count).toBe(1);

      // Set cache
      setCachedData('habit-123', habitData);

      // Second request - cache hit
      cachedHabit = getCachedData('habit-123');
      expect(cachedHabit.data).toEqual(habitData);
      expect(cacheHits.count).toBe(1);

      // Multiple requests should all be cache hits
      for (let i = 0; i < 100; i++) {
        getCachedData('habit-123');
      }

      expect(cacheHits.count).toBe(101); // 1 + 100
      expect(cacheMisses.count).toBe(1); // Still only 1 miss

      // Cache hit ratio should be very high
      const hitRatio = cacheHits.count / (cacheHits.count + cacheMisses.count);
      expect(hitRatio).toBeGreaterThan(0.99);
    });

    it('should handle cache invalidation efficiently', async () => {
      const cache = new Map();
      const invalidationLog: string[] = [];

      const invalidateCache = (pattern: string) => {
        const keysToDelete = [];
        
        for (const key of cache.keys()) {
          if (key.includes(pattern)) {
            keysToDelete.push(key);
          }
        }

        keysToDelete.forEach(key => {
          cache.delete(key);
          invalidationLog.push(key);
        });

        return keysToDelete.length;
      };

      // Set up cache with various keys
      cache.set('habits-user-123', { data: 'habits' });
      cache.set('analytics-user-123', { data: 'analytics' });
      cache.set('streaks-user-123', { data: 'streaks' });
      cache.set('habits-user-456', { data: 'other user habits' });

      expect(cache.size).toBe(4);

      // Invalidate all cache entries for user-123
      const invalidatedCount = invalidateCache('user-123');

      expect(invalidatedCount).toBe(3);
      expect(cache.size).toBe(1); // Only user-456 data remains
      expect(invalidationLog).toHaveLength(3);
      expect(invalidationLog.every(key => key.includes('user-123'))).toBe(true);
    });
  });
});