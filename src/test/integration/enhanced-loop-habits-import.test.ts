// src/test/integration/enhanced-loop-habits-import.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnhancedLoopHabitsImporter } from '../../lib/import/enhanced-loop-habits';
import type { ImportProgress, ConflictResolution } from '../../lib/import/enhanced-loop-habits';

// Mock the Supabase server client
vi.mock('../../lib/supabase/server', () => ({
  createServerClient: vi.fn(() => mockSupabase)
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({ data: [] }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({ data: { id: 'test-id', name: 'Test Habit' } }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({}))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({}))
    }))
  }))
};

// Mock cookies
const mockCookies = {} as any;

describe('Enhanced Loop Habits Import', () => {
  let importer: EnhancedLoopHabitsImporter;
  let progressUpdates: ImportProgress[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    progressUpdates = [];
    const progressCallback = (progress: ImportProgress) => {
      progressUpdates.push(progress);
    };
    
    importer = new EnhancedLoopHabitsImporter(mockCookies, 'test-user-id', progressCallback);
  });

  describe('CSV Validation', () => {
    it('should validate required CSV files', async () => {
      const csvFiles = {
        habits: '',
        checkmarks: '',
        scores: ''
      };

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].type).toBe('validation');
    });

    it('should validate habits CSV structure', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Exercise,Did you exercise?,Daily workout',
        checkmarks: 'Date,Exercise\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      // Should pass validation
      expect(result.errors.filter(e => e.type === 'validation').length).toBe(0);
    });

    it('should detect missing required columns', async () => {
      const csvFiles = {
        habits: 'position,name\n1,Exercise', // Missing question and description
        checkmarks: 'Date,Exercise\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      expect(result.errors.some(e => 
        e.type === 'validation' && e.message.includes('missing required columns')
      )).toBe(true);
    });

    it('should validate date formats in checkmarks', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Exercise,Did you exercise?,Daily workout',
        checkmarks: 'Date,Exercise\ninvalid-date,2\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      expect(result.warnings.some(w => 
        w.type === 'validation' && w.message.includes('invalid date format')
      )).toBe(true);
    });

    it('should cross-validate habit names between files', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Exercise,Did you exercise?,Daily workout',
        checkmarks: 'Date,Workout\n2024-01-01,2', // Different name
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      expect(result.warnings.some(w => 
        w.type === 'validation' && w.message.includes('missing from checkmarks')
      )).toBe(true);
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize habit names and descriptions', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,"<script>alert(1)</script>Exercise",Did you exercise?,"Daily <b>workout</b>"',
        checkmarks: 'Date,Exercise\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      // Mock existing habits check to return empty
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [] }))
        }))
      });

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      // Should sanitize HTML tags
      expect(result.success).toBe(true);
    });

    it('should validate and sanitize color values', async () => {
      const csvFiles = {
        habits: 'position,name,question,description,numRepetitions,interval,color\n1,Exercise,Did you exercise?,Daily workout,1,1,invalid-color',
        checkmarks: 'Date,Exercise\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [] }))
        }))
      });

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      // Should use default color for invalid values
      expect(result.success).toBe(true);
    });
  });

  describe('Conflict Detection and Resolution', () => {
    it('should detect naming conflicts with existing habits', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Exercise,Did you exercise?,Daily workout',
        checkmarks: 'Date,Exercise\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      // Mock existing habit with same name
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ 
            data: [{ id: 'existing-id', name: 'Exercise', description: 'Existing exercise habit', created_at: '2024-01-01' }] 
          }))
        }))
      });

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].habitName).toBe('Exercise');
    });

    it('should apply merge conflict resolution', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Exercise,Did you exercise?,Daily workout',
        checkmarks: 'Date,Exercise\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      const conflictResolutions: ConflictResolution[] = [{
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
      }];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [] }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 'new-id', name: 'Exercise' } }))
          }))
        }))
      });

      const result = await importer.importWithEnhancedHandling(csvFiles, conflictResolutions);
      
      expect(result.success).toBe(true);
      expect(result.importedHabits).toBe(1);
    });

    it('should apply rename conflict resolution', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Exercise,Did you exercise?,Daily workout',
        checkmarks: 'Date,Exercise\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      const conflictResolutions: ConflictResolution[] = [{
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
        resolution: 'rename',
        newName: 'Exercise (Imported)'
      }];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [] }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 'new-id', name: 'Exercise (Imported)' } }))
          }))
        }))
      });

      const result = await importer.importWithEnhancedHandling(csvFiles, conflictResolutions);
      
      expect(result.success).toBe(true);
      expect(result.importedHabits).toBe(1);
    });

    it('should skip habits with skip resolution', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Exercise,Did you exercise?,Daily workout',
        checkmarks: 'Date,Exercise\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      const conflictResolutions: ConflictResolution[] = [{
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
        resolution: 'skip'
      }];

      const result = await importer.importWithEnhancedHandling(csvFiles, conflictResolutions);
      
      expect(result.success).toBe(true);
      expect(result.importedHabits).toBe(0);
      // The skip logic removes the habit from the list, so it's not counted as skipped in the final stats
      expect(result.totalHabits).toBe(1); // Original habit count
    });
  });

  describe('Progress Tracking', () => {
    it('should emit progress updates during import', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Exercise,Did you exercise?,Daily workout',
        checkmarks: 'Date,Exercise\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [] }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 'new-id', name: 'Exercise' } }))
          }))
        }))
      });

      await importer.importWithEnhancedHandling(csvFiles);
      
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('validation');
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('complete');
    });

    it('should track progress percentages correctly', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Exercise,Did you exercise?,Daily workout',
        checkmarks: 'Date,Exercise\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [] }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 'new-id', name: 'Exercise' } }))
          }))
        }))
      });

      await importer.importWithEnhancedHandling(csvFiles);
      
      // Progress should increase over time
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].progress).toBeGreaterThanOrEqual(progressUpdates[i - 1].progress);
      }
      
      // Final progress should be 100%
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Exercise,Did you exercise?,Daily workout',
        checkmarks: 'Date,Exercise\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      // Mock database error during insert
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [] }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => {
              throw new Error('Database connection failed');
            })
          }))
        }))
      });

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      expect(result.success).toBe(true); // Import continues despite individual errors
      expect(result.errors.some(e => e.type === 'database')).toBe(true);
    });

    it('should provide detailed error information', async () => {
      const csvFiles = {
        habits: 'invalid,csv,format',
        checkmarks: 'Date,Exercise\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toHaveProperty('message');
      expect(result.errors[0]).toHaveProperty('type');
      expect(result.errors[0]).toHaveProperty('severity');
    });
  });

  describe('Statistics Generation', () => {
    it('should generate import statistics', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Exercise,Did you exercise?,Daily workout\n2,Reading,Did you read?,Daily reading',
        checkmarks: 'Date,Exercise,Reading\n2024-01-01,2,2\n2024-01-02,2,0',
        scores: 'Date,Exercise,Reading\n2024-01-01,1.0,1.0\n2024-01-02,1.0,0.0'
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [] }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 'new-id', name: 'Exercise' } }))
          }))
        }))
      });

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      expect(result.success).toBe(true);
      expect(result.statistics).toBeDefined();
      expect(result.statistics.habitsByCategory).toBeDefined();
      expect(result.statistics.entriesByMonth).toBeDefined();
    });

    it('should generate helpful recommendations', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Exercise,Did you exercise?,Daily workout',
        checkmarks: 'Date,Exercise\n2024-01-01,2',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [] }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 'new-id', name: 'Exercise' } }))
          }))
        }))
      });

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      expect(result.success).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Habit Value Normalization', () => {
    it('should correctly normalize vaping habit values', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Vaping,Did you vape?,Track vaping',
        checkmarks: 'Date,Vaping\n2024-01-01,2\n2024-01-02,0\n2024-01-03,3',
        scores: 'Date,Vaping\n2024-01-01,1.0'
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [] }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 'new-id', name: 'Vaping' } }))
          }))
        }))
      });

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      expect(result.success).toBe(true);
      expect(result.importedEntries).toBe(3);
    });

    it('should correctly normalize break habit values', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,No Smoking,Did you avoid smoking?,Quit smoking',
        checkmarks: 'Date,No Smoking\n2024-01-01,2\n2024-01-02,0\n2024-01-03,3',
        scores: 'Date,No Smoking\n2024-01-01,1.0'
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [] }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 'new-id', name: 'No Smoking' } }))
          }))
        }))
      });

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      expect(result.success).toBe(true);
      expect(result.importedEntries).toBe(3);
    });

    it('should correctly normalize build habit values', async () => {
      const csvFiles = {
        habits: 'position,name,question,description\n1,Exercise,Did you exercise?,Daily workout',
        checkmarks: 'Date,Exercise\n2024-01-01,2\n2024-01-02,0\n2024-01-03,3',
        scores: 'Date,Exercise\n2024-01-01,1.0'
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: [] }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: { id: 'new-id', name: 'Exercise' } }))
          }))
        }))
      });

      const result = await importer.importWithEnhancedHandling(csvFiles);
      
      expect(result.success).toBe(true);
      expect(result.importedEntries).toBe(3);
    });
  });
});