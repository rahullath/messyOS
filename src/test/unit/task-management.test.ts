import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskService, TimeTrackingService, GoalService, TaskValidation } from '../../lib/task-management/task-service';
import type { CreateTaskRequest, UpdateTaskRequest, StartSessionRequest, EndSessionRequest } from '../../types/task-management';

// Mock Supabase
vi.mock('../../lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            range: vi.fn()
          }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn()
            }))
          }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn()
        }))
      }))
    }))
  }
}));

describe('TaskValidation', () => {
  describe('validateCreateTask', () => {
    it('should validate a valid task creation request', () => {
      const validTask: CreateTaskRequest = {
        title: 'Test Task',
        description: 'Test Description',
        category: 'work',
        priority: 'medium',
        complexity: 'moderate',
        energy_required: 'medium',
        estimated_duration: 60
      };

      const result = TaskValidation.validateCreateTask(validTask);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject task without title', () => {
      const invalidTask = {
        category: 'work'
      };

      const result = TaskValidation.validateCreateTask(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a non-empty string'
      });
    });

    it('should reject task with empty title', () => {
      const invalidTask = {
        title: '   ',
        category: 'work'
      };

      const result = TaskValidation.validateCreateTask(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title is required and must be a non-empty string'
      });
    });

    it('should reject task with title too long', () => {
      const invalidTask = {
        title: 'a'.repeat(256),
        category: 'work'
      };

      const result = TaskValidation.validateCreateTask(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'title',
        message: 'Title must be 255 characters or less'
      });
    });

    it('should reject task without category', () => {
      const invalidTask = {
        title: 'Test Task'
      };

      const result = TaskValidation.validateCreateTask(invalidTask);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'category',
        message: 'Category is required and must be a non-empty string'
      });
    });

    it('should accept task with valid deadline', () => {
      const validTask = {
        title: 'Test Task',
        category: 'work',
        deadline: '2025-12-31T23:59:59Z'
      };

      const result = TaskValidation.validateCreateTask(validTask);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateUpdateTask', () => {
    it('should validate a valid task update request', () => {
      const validUpdate: UpdateTaskRequest = {
        title: 'Updated Task',
        priority: 'high',
        status: 'in_progress'
      };

      const result = TaskValidation.validateUpdateTask(validUpdate);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow partial updates', () => {
      const partialUpdate = {
        priority: 'urgent'
      };

      const result = TaskValidation.validateUpdateTask(partialUpdate);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('Task Management Data Validation', () => {
  describe('Task Priority Validation', () => {
    it('should accept all valid priority values', () => {
      const priorities = ['low', 'medium', 'high', 'urgent'];
      
      priorities.forEach(priority => {
        const task = {
          title: 'Test Task',
          category: 'work',
          priority
        };
        
        const result = TaskValidation.validateCreateTask(task);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Duration Validation', () => {
    it('should accept positive duration values', () => {
      const durations = [1, 30, 60, 120, 480];
      
      durations.forEach(estimated_duration => {
        const task = {
          title: 'Test Task',
          category: 'work',
          estimated_duration
        };
        
        const result = TaskValidation.validateCreateTask(task);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject zero or negative durations', () => {
      const invalidDurations = [0, -1, -30];
      
      invalidDurations.forEach(estimated_duration => {
        const task = {
          title: 'Test Task',
          category: 'work',
          estimated_duration
        };
        
        const result = TaskValidation.validateCreateTask(task);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'estimated_duration',
          message: 'Estimated duration must be a positive number'
        });
      });
    });
  });
});