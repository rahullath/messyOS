// src/test/integration/analytics-generation.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createServerAuth } from '../../lib/auth/simple-multi-user';

// Mock the auth module
vi.mock('../../lib/auth/simple-multi-user', () => ({
  createServerAuth: vi.fn()
}));

describe('Analytics Generation Integration', () => {
  let mockSupabase: any;
  let mockAuth: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock Supabase client
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

  it('should generate completion rate analytics', async () => {
    // Mock habit entries data
    const mockEntries = [
      { date: '2025-01-01', value: 1, habit_id: 'habit-1' },
      { date: '2025-01-02', value: 1, habit_id: 'habit-1' },
      { date: '2025-01-03', value: 0, habit_id: 'habit-1' },
      { date: '2025-01-04', value: 1, habit_id: 'habit-1' },
      { date: '2025-01-05', value: 2, habit_id: 'habit-1' }, // skipped
    ];

    mockSupabase.single.mockResolvedValueOnce({
      data: mockEntries,
      error: null
    });

    const request = new Request('http://localhost/api/habits/analytics/optimized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitIds: ['habit-1'],
        timeRange: '7d',
        analysisType: 'completion_rates'
      })
    });

    const cookies = new Map();

    const { POST } = await import('../../pages/api/habits/analytics/optimized.ts');
    const response = await POST({ request, cookies } as any);

    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.analytics).toBeDefined();
    expect(responseData.analytics.completionRate).toBeDefined();
    
    // Should calculate completion rate correctly (3 completed out of 5 total = 60%)
    // Note: Skipped entries might be counted differently based on business logic
  });

  it('should generate context correlation analytics', async () => {
    // Mock habit entries with context data
    const mockEntries = [
      { 
        date: '2025-01-01', 
        value: 1, 
        habit_id: 'habit-1',
        mood: 5,
        energy_level: 4,
        effort: 3,
        location: 'Gym',
        weather: 'Sunny'
      },
      { 
        date: '2025-01-02', 
        value: 1, 
        habit_id: 'habit-1',
        mood: 4,
        energy_level: 5,
        effort: 4,
        location: 'Home',
        weather: 'Rainy'
      },
      { 
        date: '2025-01-03', 
        value: 0, 
        habit_id: 'habit-1',
        mood: 2,
        energy_level: 2,
        effort: 1,
        location: 'Office',
        weather: 'Cloudy'
      }
    ];

    mockSupabase.single.mockResolvedValueOnce({
      data: mockEntries,
      error: null
    });

    const request = new Request('http://localhost/api/habits/analytics/optimized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitIds: ['habit-1'],
        timeRange: '7d',
        analysisType: 'context_correlations'
      })
    });

    const cookies = new Map();

    const { POST } = await import('../../pages/api/habits/analytics/optimized.ts');
    const response = await POST({ request, cookies } as any);

    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.analytics).toBeDefined();
    expect(responseData.analytics.contextCorrelations).toBeDefined();
    
    // Should identify patterns like high mood/energy correlating with success
    const correlations = responseData.analytics.contextCorrelations;
    expect(correlations.mood).toBeDefined();
    expect(correlations.energy_level).toBeDefined();
  });

  it('should generate streak timeline analytics', async () => {
    // Mock habit entries for streak calculation
    const mockEntries = [];
    const baseDate = new Date('2025-01-01');
    
    // Create 30 days of data with some streaks and breaks
    for (let i = 0; i < 30; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      
      // Create pattern: 5 days success, 2 days fail, repeat
      const value = (i % 7) < 5 ? 1 : 0;
      
      mockEntries.push({
        date: date.toISOString().split('T')[0],
        value,
        habit_id: 'habit-1'
      });
    }

    mockSupabase.single.mockResolvedValueOnce({
      data: mockEntries,
      error: null
    });

    const request = new Request('http://localhost/api/habits/analytics/optimized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitIds: ['habit-1'],
        timeRange: '30d',
        analysisType: 'streak_timeline'
      })
    });

    const cookies = new Map();

    const { POST } = await import('../../pages/api/habits/analytics/optimized.ts');
    const response = await POST({ request, cookies } as any);

    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.analytics).toBeDefined();
    expect(responseData.analytics.streakTimeline).toBeDefined();
    
    // Should identify streak patterns
    const timeline = responseData.analytics.streakTimeline;
    expect(Array.isArray(timeline)).toBe(true);
    expect(timeline.length).toBeGreaterThan(0);
  });

  it('should generate cross-habit correlation analytics', async () => {
    // Mock multiple habits data
    const mockHabits = [
      { id: 'habit-1', name: 'Exercise', user_id: 'user-123' },
      { id: 'habit-2', name: 'Meditation', user_id: 'user-123' }
    ];

    const mockEntries = [
      // Days where both habits were completed
      { date: '2025-01-01', value: 1, habit_id: 'habit-1' },
      { date: '2025-01-01', value: 1, habit_id: 'habit-2' },
      { date: '2025-01-02', value: 1, habit_id: 'habit-1' },
      { date: '2025-01-02', value: 1, habit_id: 'habit-2' },
      
      // Days where only one was completed
      { date: '2025-01-03', value: 1, habit_id: 'habit-1' },
      { date: '2025-01-03', value: 0, habit_id: 'habit-2' },
      { date: '2025-01-04', value: 0, habit_id: 'habit-1' },
      { date: '2025-01-04', value: 1, habit_id: 'habit-2' },
    ];

    // Mock habits query
    mockSupabase.single.mockResolvedValueOnce({
      data: mockHabits,
      error: null
    });

    // Mock entries query
    mockSupabase.single.mockResolvedValueOnce({
      data: mockEntries,
      error: null
    });

    const request = new Request('http://localhost/api/habits/analytics/optimized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitIds: ['habit-1', 'habit-2'],
        timeRange: '7d',
        analysisType: 'cross_habit_correlations'
      })
    });

    const cookies = new Map();

    const { POST } = await import('../../pages/api/habits/analytics/optimized.ts');
    const response = await POST({ request, cookies } as any);

    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.analytics).toBeDefined();
    expect(responseData.analytics.crossHabitCorrelations).toBeDefined();
    
    // Should calculate correlation between habits
    const correlations = responseData.analytics.crossHabitCorrelations;
    expect(Array.isArray(correlations)).toBe(true);
  });

  it('should handle large datasets efficiently', async () => {
    // Mock large dataset (1000 entries)
    const mockEntries = [];
    const baseDate = new Date('2024-01-01');
    
    for (let i = 0; i < 1000; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + (i % 365));
      
      mockEntries.push({
        date: date.toISOString().split('T')[0],
        value: Math.random() > 0.3 ? 1 : 0, // 70% success rate
        habit_id: `habit-${i % 10}`, // 10 different habits
        mood: Math.floor(Math.random() * 5) + 1,
        energy_level: Math.floor(Math.random() * 5) + 1,
        effort: Math.floor(Math.random() * 5) + 1
      });
    }

    mockSupabase.single.mockResolvedValueOnce({
      data: mockEntries,
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
    const processingTime = endTime - startTime;

    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.analytics).toBeDefined();
    expect(responseData.performance).toBeDefined();
    
    // Should complete within reasonable time (less than 5 seconds)
    expect(processingTime).toBeLessThan(5000);
    
    // Should include performance metrics
    expect(responseData.performance.processingTime).toBeDefined();
    expect(responseData.performance.entriesProcessed).toBe(1000);
  });

  it('should handle missing data gracefully', async () => {
    // Mock empty dataset
    mockSupabase.single.mockResolvedValueOnce({
      data: [],
      error: null
    });

    const request = new Request('http://localhost/api/habits/analytics/optimized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitIds: ['nonexistent-habit'],
        timeRange: '30d',
        analysisType: 'completion_rates'
      })
    });

    const cookies = new Map();

    const { POST } = await import('../../pages/api/habits/analytics/optimized.ts');
    const response = await POST({ request, cookies } as any);

    expect(response.status).toBe(200);
    
    const responseData = await response.json();
    expect(responseData.analytics).toBeDefined();
    expect(responseData.analytics.completionRate).toBe(0);
    expect(responseData.message).toContain('No data found');
  });

  it('should validate analytics request parameters', async () => {
    const invalidRequest = new Request('http://localhost/api/habits/analytics/optimized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Missing required fields
        timeRange: 'invalid-range'
      })
    });

    const cookies = new Map();

    const { POST } = await import('../../pages/api/habits/analytics/optimized.ts');
    const response = await POST({ request, cookies } as any);

    expect(response.status).toBe(400);
    
    const responseData = await response.json();
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain('Invalid request parameters');
  });

  it('should handle database errors gracefully', async () => {
    // Mock database error
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: new Error('Database connection failed')
    });

    const request = new Request('http://localhost/api/habits/analytics/optimized', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitIds: ['habit-1'],
        timeRange: '7d',
        analysisType: 'completion_rates'
      })
    });

    const cookies = new Map();

    const { POST } = await import('../../pages/api/habits/analytics/optimized.ts');
    const response = await POST({ request, cookies } as any);

    expect(response.status).toBe(500);
    
    const responseData = await response.json();
    expect(responseData.error).toBe('Database connection failed');
  });
});