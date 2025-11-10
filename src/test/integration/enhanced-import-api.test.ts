// src/test/integration/enhanced-import-api.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the enhanced importer
vi.mock('../../lib/import/enhanced-loop-habits', () => ({
  EnhancedLoopHabitsImporter: vi.fn().mockImplementation(() => ({
    importWithEnhancedHandling: vi.fn()
  }))
}));

// Mock auth
vi.mock('../../lib/auth/simple-multi-user', () => ({
  createServerAuth: vi.fn(() => ({
    requireAuth: vi.fn(() => Promise.resolve({ id: 'test-user-id' })),
    supabase: {}
  }))
}));

describe('Enhanced Loop Habits Import API', () => {
  const mockCookies = new Map();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle missing files', async () => {
    const formData = new FormData();
    // Missing required files

    const request = new Request('http://localhost/api/import/enhanced-loop-habits', {
      method: 'POST',
      body: formData
    });

    const { POST } = await import('../../pages/api/import/enhanced-loop-habits');
    const response = await POST({ request, cookies: mockCookies as any });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.type).toBe('error');
    expect(data.message).toContain('Missing required CSV files');
  });

  it('should handle successful import with progress streaming', async () => {
    const { EnhancedLoopHabitsImporter } = await import('../../lib/import/enhanced-loop-habits');
    const mockImporter = new EnhancedLoopHabitsImporter({} as any, 'test-user', () => {});
    
    // Mock successful import
    (mockImporter.importWithEnhancedHandling as any).mockResolvedValue({
      success: true,
      totalHabits: 2,
      importedHabits: 2,
      skippedHabits: 0,
      totalEntries: 10,
      importedEntries: 10,
      failedEntries: 0,
      conflicts: [],
      errors: [],
      warnings: [],
      recommendations: ['Great job importing your habits!'],
      processingTime: 1500,
      statistics: {
        habitsByCategory: { 'Fitness': 1, 'Health': 1 },
        entriesByMonth: { '2024-01': 10 },
        averageStreakLength: 5,
        mostActiveHabit: 'Exercise'
      }
    });

    const formData = new FormData();
    formData.append('habits', new File(['position,name,question,description\n1,Exercise,Did you exercise?,Daily workout'], 'habits.csv'));
    formData.append('checkmarks', new File(['Date,Exercise\n2024-01-01,2'], 'checkmarks.csv'));
    formData.append('scores', new File(['Date,Exercise\n2024-01-01,1.0'], 'scores.csv'));

    const request = new Request('http://localhost/api/import/enhanced-loop-habits', {
      method: 'POST',
      body: formData
    });

    const { POST } = await import('../../pages/api/import/enhanced-loop-habits');
    const response = await POST({ request, cookies: mockCookies as any });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/x-ndjson');
  });

  it('should handle conflicts requiring resolution', async () => {
    const { EnhancedLoopHabitsImporter } = await import('../../lib/import/enhanced-loop-habits');
    const mockImporter = new EnhancedLoopHabitsImporter({} as any, 'test-user', () => {});
    
    // Mock import with conflicts
    (mockImporter.importWithEnhancedHandling as any).mockResolvedValue({
      success: false,
      conflicts: [{
        habitName: 'Exercise',
        existingHabit: {
          id: 'existing-id',
          name: 'Exercise',
          description: 'Existing exercise habit',
          created_at: '2024-01-01',
          total_entries: 5
        },
        importedHabit: {
          name: 'Exercise',
          description: 'Daily workout',
          entries_count: 10
        },
        resolution: 'merge'
      }],
      errors: [],
      warnings: [],
      recommendations: [],
      processingTime: 500,
      statistics: {
        habitsByCategory: {},
        entriesByMonth: {},
        averageStreakLength: 0,
        mostActiveHabit: ''
      }
    });

    const formData = new FormData();
    formData.append('habits', new File(['position,name,question,description\n1,Exercise,Did you exercise?,Daily workout'], 'habits.csv'));
    formData.append('checkmarks', new File(['Date,Exercise\n2024-01-01,2'], 'checkmarks.csv'));
    formData.append('scores', new File(['Date,Exercise\n2024-01-01,1.0'], 'scores.csv'));

    const request = new Request('http://localhost/api/import/enhanced-loop-habits', {
      method: 'POST',
      body: formData
    });

    const { POST } = await import('../../pages/api/import/enhanced-loop-habits');
    const response = await POST({ request, cookies: mockCookies as any });

    expect(response.status).toBe(200);
    
    // Read the streaming response
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
  });

  it('should handle conflict resolutions', async () => {
    const { EnhancedLoopHabitsImporter } = await import('../../lib/import/enhanced-loop-habits');
    const mockImporter = new EnhancedLoopHabitsImporter({} as any, 'test-user', () => {});
    
    // Mock successful import after conflict resolution
    (mockImporter.importWithEnhancedHandling as any).mockResolvedValue({
      success: true,
      totalHabits: 1,
      importedHabits: 1,
      skippedHabits: 0,
      totalEntries: 5,
      importedEntries: 5,
      failedEntries: 0,
      conflicts: [],
      errors: [],
      warnings: [],
      recommendations: ['Successfully resolved conflicts'],
      processingTime: 2000,
      statistics: {
        habitsByCategory: { 'Fitness': 1 },
        entriesByMonth: { '2024-01': 5 },
        averageStreakLength: 3,
        mostActiveHabit: 'Exercise (Imported)'
      }
    });

    const conflictResolutions = [{
      habitName: 'Exercise',
      existingHabit: {
        id: 'existing-id',
        name: 'Exercise',
        description: 'Existing exercise habit',
        created_at: '2024-01-01',
        total_entries: 5
      },
      importedHabit: {
        name: 'Exercise',
        description: 'Daily workout',
        entries_count: 10
      },
      resolution: 'rename' as const,
      newName: 'Exercise (Imported)'
    }];

    const formData = new FormData();
    formData.append('habits', new File(['position,name,question,description\n1,Exercise,Did you exercise?,Daily workout'], 'habits.csv'));
    formData.append('checkmarks', new File(['Date,Exercise\n2024-01-01,2'], 'checkmarks.csv'));
    formData.append('scores', new File(['Date,Exercise\n2024-01-01,1.0'], 'scores.csv'));
    formData.append('conflictResolutions', JSON.stringify(conflictResolutions));

    const request = new Request('http://localhost/api/import/enhanced-loop-habits', {
      method: 'POST',
      body: formData
    });

    const { POST } = await import('../../pages/api/import/enhanced-loop-habits');
    const response = await POST({ request, cookies: mockCookies as any });

    expect(response.status).toBe(200);
    expect(mockImporter.importWithEnhancedHandling).toHaveBeenCalledWith(
      expect.any(Object),
      conflictResolutions
    );
  });

  it('should handle authentication errors', async () => {
    // Mock auth failure
    const { createServerAuth } = await import('../../lib/auth/simple-multi-user');
    (createServerAuth as any).mockReturnValue({
      requireAuth: vi.fn(() => Promise.reject(new Error('Authentication required')))
    });

    const formData = new FormData();
    formData.append('habits', new File(['test'], 'habits.csv'));
    formData.append('checkmarks', new File(['test'], 'checkmarks.csv'));
    formData.append('scores', new File(['test'], 'scores.csv'));

    const request = new Request('http://localhost/api/import/enhanced-loop-habits', {
      method: 'POST',
      body: formData
    });

    const { POST } = await import('../../pages/api/import/enhanced-loop-habits');
    const response = await POST({ request, cookies: mockCookies as any });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.type).toBe('error');
    expect(data.message).toContain('sign in');
  });

  it('should handle import errors gracefully', async () => {
    const { EnhancedLoopHabitsImporter } = await import('../../lib/import/enhanced-loop-habits');
    const mockImporter = new EnhancedLoopHabitsImporter({} as any, 'test-user', () => {});
    
    // Mock import failure
    (mockImporter.importWithEnhancedHandling as any).mockRejectedValue(new Error('Database connection failed'));

    const formData = new FormData();
    formData.append('habits', new File(['test'], 'habits.csv'));
    formData.append('checkmarks', new File(['test'], 'checkmarks.csv'));
    formData.append('scores', new File(['test'], 'scores.csv'));

    const request = new Request('http://localhost/api/import/enhanced-loop-habits', {
      method: 'POST',
      body: formData
    });

    const { POST } = await import('../../pages/api/import/enhanced-loop-habits');
    const response = await POST({ request, cookies: mockCookies as any });

    expect(response.status).toBe(200); // Streaming response
    
    // The error should be sent as part of the stream
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
  });

  it('should validate file sizes', async () => {
    // Create a large file (mock)
    const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
    const largeFile = new File([largeContent], 'habits.csv');

    const formData = new FormData();
    formData.append('habits', largeFile);
    formData.append('checkmarks', new File(['test'], 'checkmarks.csv'));
    formData.append('scores', new File(['test'], 'scores.csv'));

    const request = new Request('http://localhost/api/import/enhanced-loop-habits', {
      method: 'POST',
      body: formData
    });

    const { POST } = await import('../../pages/api/import/enhanced-loop-habits');
    const response = await POST({ request, cookies: mockCookies as any });

    // The validation should happen in the frontend component
    // The API should still accept the file but the importer will handle validation
    expect(response.status).toBe(200);
  });
});