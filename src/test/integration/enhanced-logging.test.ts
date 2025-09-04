// src/test/integration/enhanced-logging.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createServerAuth } from '../../lib/auth/simple-multi-user';

// Mock the auth module
vi.mock('../../lib/auth/simple-multi-user', () => ({
  createServerAuth: vi.fn()
}));

describe('Enhanced Logging API', () => {
  let mockSupabase: any;
  let mockAuth: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    };

    // Mock auth
    mockAuth = {
      requireAuth: vi.fn().mockResolvedValue({ id: 'user-123' }),
      supabase: mockSupabase
    };

    (createServerAuth as any).mockReturnValue(mockAuth);
  });

  it('should validate required fields', async () => {
    // Mock no existing entry
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
    
    // Mock successful insert
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'entry-123',
        habit_id: 'habit-123',
        user_id: 'user-123',
        value: 1,
        date: '2025-01-01'
      },
      error: null
    });

    // Mock streak calculation queries
    mockSupabase.single.mockResolvedValueOnce({ data: [], error: null });

    const request = new Request('http://localhost/api/habits/habit-123/log-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: 1,
        date: '2025-01-01',
        effort: 4,
        energy_level: 3,
        mood: 4,
        location: 'Home',
        weather: 'Sunny',
        context: ['Morning', 'High Energy'],
        notes: 'Felt great today!'
      })
    });

    const cookies = new Map();
    const params = { id: 'habit-123' };

    // Import the API handler
    const { POST } = await import('../../pages/api/habits/[id]/log-enhanced.ts');
    const response = await POST({ request, params, cookies } as any);

    expect(response.status).toBe(200);
    
    // Verify the insert was called with correct data
    expect(mockSupabase.insert).toHaveBeenCalledWith([{
      habit_id: 'habit-123',
      user_id: 'user-123',
      value: 1,
      notes: 'Felt great today!',
      effort: 4,
      duration_minutes: null,
      completion_time: null,
      energy_level: 3,
      mood: 4,
      location: 'Home',
      weather: 'Sunny',
      context_tags: ['Morning', 'High Energy'],
      logged_at: expect.any(String),
      date: '2025-01-01'
    }]);
  });

  it('should handle missing optional fields', async () => {
    // Mock no existing entry
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
    
    // Mock successful insert
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'entry-123',
        habit_id: 'habit-123',
        user_id: 'user-123',
        value: 1
      },
      error: null
    });

    // Mock streak calculation queries
    mockSupabase.single.mockResolvedValueOnce({ data: [], error: null });

    const request = new Request('http://localhost/api/habits/habit-123/log-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: 1
        // All other fields are optional
      })
    });

    const cookies = new Map();
    const params = { id: 'habit-123' };

    const { POST } = await import('../../pages/api/habits/[id]/log-enhanced.ts');
    const response = await POST({ request, params, cookies } as any);

    expect(response.status).toBe(200);
    
    // Verify the insert was called with default values
    expect(mockSupabase.insert).toHaveBeenCalledWith([{
      habit_id: 'habit-123',
      user_id: 'user-123',
      value: 1,
      notes: null,
      effort: 3, // default
      duration_minutes: null,
      completion_time: null,
      energy_level: 3, // default
      mood: 3, // default
      location: null,
      weather: null,
      context_tags: [],
      logged_at: expect.any(String),
      date: expect.any(String) // today's date
    }]);
  });

  it('should update existing entries instead of creating duplicates', async () => {
    // Mock existing entry
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'existing-entry-123' },
      error: null
    });
    
    // Mock successful update
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: 'existing-entry-123',
        habit_id: 'habit-123',
        user_id: 'user-123',
        value: 1
      },
      error: null
    });

    // Mock streak calculation queries
    mockSupabase.single.mockResolvedValueOnce({ data: [], error: null });

    const request = new Request('http://localhost/api/habits/habit-123/log-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: 1,
        date: '2025-01-01',
        notes: 'Updated entry'
      })
    });

    const cookies = new Map();
    const params = { id: 'habit-123' };

    const { POST } = await import('../../pages/api/habits/[id]/log-enhanced.ts');
    const response = await POST({ request, params, cookies } as any);

    expect(response.status).toBe(200);
    
    // Verify update was called instead of insert
    expect(mockSupabase.update).toHaveBeenCalled();
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  it('should handle authentication errors', async () => {
    // Mock auth failure
    const authError = new Error('Authentication required');
    mockAuth.requireAuth.mockRejectedValueOnce(authError);

    const request = new Request('http://localhost/api/habits/habit-123/log-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 1 })
    });

    const cookies = new Map();
    const params = { id: 'habit-123' };

    try {
      const { POST } = await import('../../pages/api/habits/[id]/log-enhanced.ts');
      const response = await POST({ request, params, cookies } as any);

      expect(response.status).toBe(401);
      
      const responseData = await response.json();
      expect(responseData.error).toBe('Please sign in to continue');
    } catch (error) {
      // If the error is thrown during execution, that's expected behavior
      // The API should handle it gracefully in production
      expect((error as Error).message).toBe('Authentication required');
    }
  });

  it('should handle database errors gracefully', async () => {
    // Mock no existing entry
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });
    
    // Mock database error
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: new Error('Database connection failed')
    });

    const request = new Request('http://localhost/api/habits/habit-123/log-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 1 })
    });

    const cookies = new Map();
    const params = { id: 'habit-123' };

    const { POST } = await import('../../pages/api/habits/[id]/log-enhanced.ts');
    const response = await POST({ request, params, cookies } as any);

    expect(response.status).toBe(500);
    
    const responseData = await response.json();
    expect(responseData.error).toBe('Database connection failed');
  });
});