// src/test/unit/routine-service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RoutineService } from '../../lib/uk-student/routine-service';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Routine as RoutineType, RoutineStep as RoutineStepType } from '../../types/uk-student';

// Mock Supabase client
const createMockSupabase = (): SupabaseClient => {
  const mockFrom = vi.fn();
  
  const mockQuery = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  };

  mockFrom.mockReturnValue(mockQuery);

  return {
    from: mockFrom,
  } as any;
};

describe('RoutineService', () => {
  let service: RoutineService;
  let mockSupabase: SupabaseClient;
  const userId = 'test-user-123';

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new RoutineService(mockSupabase, userId);
  });

  describe('createRoutine', () => {
    it('should create a routine with provided steps', async () => {
      const steps: RoutineStepType[] = [
        {
          id: '1',
          name: 'Step 1',
          estimated_duration: 5,
          order: 1,
          required: true,
        },
        {
          id: '2',
          name: 'Step 2',
          estimated_duration: 10,
          order: 2,
          required: true,
        },
      ];

      const mockRoutine: RoutineType = {
        id: 'routine-1',
        user_id: userId,
        routine_type: 'morning',
        name: 'Morning Routine',
        steps,
        estimated_duration: 15,
        frequency: 'daily',
        completion_streak: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockQuery = mockSupabase.from('uk_student_routines') as any;
      mockQuery.insert.mockReturnThis();
      mockQuery.select.mockReturnThis();
      mockQuery.single.mockResolvedValue({ data: mockRoutine, error: null });

      const result = await service.createRoutine('morning', 'Morning Routine', steps);

      expect(result).toEqual(mockRoutine);
      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('should calculate total duration from steps', async () => {
      const steps: RoutineStepType[] = [
        { id: '1', name: 'Step 1', estimated_duration: 5, order: 1, required: true },
        { id: '2', name: 'Step 2', estimated_duration: 10, order: 2, required: true },
        { id: '3', name: 'Step 3', estimated_duration: 8, order: 3, required: true },
      ];

      const mockRoutine: RoutineType = {
        id: 'routine-1',
        user_id: userId,
        routine_type: 'skincare',
        name: 'Skincare',
        steps,
        estimated_duration: 23,
        frequency: 'daily',
        completion_streak: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockQuery = mockSupabase.from('uk_student_routines') as any;
      mockQuery.insert.mockReturnThis();
      mockQuery.select.mockReturnThis();
      mockQuery.single.mockResolvedValue({ data: mockRoutine, error: null });

      const result = await service.createRoutine('skincare', 'Skincare', steps);

      expect(result.estimated_duration).toBe(23);
    });
  });

  describe('getActiveRoutines', () => {
    it('should return all active routines for user', async () => {
      const mockRoutines: RoutineType[] = [
        {
          id: 'routine-1',
          user_id: userId,
          routine_type: 'morning',
          name: 'Morning',
          steps: [],
          estimated_duration: 30,
          frequency: 'daily',
          completion_streak: 5,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 'routine-2',
          user_id: userId,
          routine_type: 'evening',
          name: 'Evening',
          steps: [],
          estimated_duration: 20,
          frequency: 'daily',
          completion_streak: 3,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockQuery = mockSupabase.from('uk_student_routines') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.order.mockResolvedValue({ data: mockRoutines, error: null });

      const result = await service.getActiveRoutines();

      expect(result).toEqual(mockRoutines);
      expect(result.length).toBe(2);
    });
  });

  describe('getRoutinesByType', () => {
    it('should return routines of specific type', async () => {
      const mockRoutines: RoutineType[] = [
        {
          id: 'routine-1',
          user_id: userId,
          routine_type: 'skincare',
          name: 'Morning Skincare',
          steps: [],
          estimated_duration: 15,
          frequency: 'daily',
          completion_streak: 7,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      // Create a proper chain mock
      const chainMock = {
        select: vi.fn(function() { return this; }),
        eq: vi.fn(function() { return this; }),
      };
      
      // Make the final call resolve
      chainMock.eq.mockImplementationOnce(function() { return this; });
      chainMock.eq.mockImplementationOnce(function() { return this; });
      chainMock.eq.mockResolvedValueOnce({ data: mockRoutines, error: null });
      
      (mockSupabase.from as any).mockReturnValue(chainMock);

      const result = await service.getRoutinesByType('skincare');

      expect(result).toEqual(mockRoutines);
      expect(result[0].routine_type).toBe('skincare');
    });
  });

  describe('completeRoutine', () => {
    it('should record routine completion', async () => {
      const mockCompletion = {
        id: 'completion-1',
        user_id: userId,
        routine_id: 'routine-1',
        completed_at: new Date().toISOString(),
        steps_completed: ['step-1', 'step-2'],
        total_duration: 25,
        notes: 'Completed successfully',
      };

      const mockQuery = mockSupabase.from('uk_student_routine_completions') as any;
      mockQuery.insert.mockReturnThis();
      mockQuery.select.mockReturnThis();
      mockQuery.single.mockResolvedValue({ data: mockCompletion, error: null });

      const result = await service.completeRoutine('routine-1', ['step-1', 'step-2'], 25, 'Completed successfully');

      expect(result).toEqual(mockCompletion);
      expect(mockQuery.insert).toHaveBeenCalled();
    });
  });

  describe('createSkincareRoutine', () => {
    it('should create a skincare routine with all required steps', async () => {
      const mockRoutine: RoutineType = {
        id: 'routine-skincare',
        user_id: userId,
        routine_type: 'skincare',
        name: 'Daily Skincare Routine',
        steps: [
          { id: '1', name: 'Cleanse with Cetaphil', estimated_duration: 3, order: 1, required: true },
          { id: '2', name: 'Apply Toner', estimated_duration: 2, order: 2, required: true },
          { id: '3', name: 'Apply Snail Mucin Essence', estimated_duration: 2, order: 3, required: true },
          { id: '4', name: 'Apply Moisturizer', estimated_duration: 2, order: 4, required: true },
          { id: '5', name: 'Apply Sunscreen (Morning only)', estimated_duration: 2, order: 5, required: false },
        ],
        estimated_duration: 11,
        frequency: 'daily',
        completion_streak: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockQuery = mockSupabase.from('uk_student_routines') as any;
      mockQuery.insert.mockReturnThis();
      mockQuery.select.mockReturnThis();
      mockQuery.single.mockResolvedValue({ data: mockRoutine, error: null });

      const result = await service.createSkincareRoutine();

      expect(result.routine_type).toBe('skincare');
      expect(result.steps.length).toBe(5);
      expect(result.steps[0].name).toContain('Cetaphil');
    });
  });

  describe('createMorningRoutine', () => {
    it('should create a morning routine optimized for early classes', async () => {
      const mockRoutine: RoutineType = {
        id: 'routine-morning',
        user_id: userId,
        routine_type: 'morning',
        name: 'Morning Routine',
        steps: [
          { id: '1', name: 'Wake up and hydrate', estimated_duration: 5, order: 1, required: true },
          { id: '2', name: 'Skincare routine', estimated_duration: 11, order: 2, required: true },
          { id: '3', name: 'Shower', estimated_duration: 15, order: 3, required: true },
          { id: '4', name: 'Get dressed', estimated_duration: 10, order: 4, required: true },
          { id: '5', name: 'Breakfast', estimated_duration: 15, order: 5, required: true },
          { id: '6', name: 'Review daily schedule', estimated_duration: 5, order: 6, required: false },
        ],
        estimated_duration: 61,
        frequency: 'daily',
        completion_streak: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockQuery = mockSupabase.from('uk_student_routines') as any;
      mockQuery.insert.mockReturnThis();
      mockQuery.select.mockReturnThis();
      mockQuery.single.mockResolvedValue({ data: mockRoutine, error: null });

      const result = await service.createMorningRoutine();

      expect(result.routine_type).toBe('morning');
      expect(result.steps.length).toBe(6);
      expect(result.estimated_duration).toBe(61);
    });
  });

  describe('trackSubstanceUse', () => {
    it('should record substance use tracking', async () => {
      const mockTracking = {
        id: 'tracking-1',
        user_id: userId,
        substance_type: 'vaping',
        count: 3,
        notes: 'Stressed about exam',
        tracked_at: new Date().toISOString(),
      };

      const mockQuery = mockSupabase.from('uk_student_substance_tracking') as any;
      mockQuery.insert.mockReturnThis();
      mockQuery.select.mockReturnThis();
      mockQuery.single.mockResolvedValue({ data: mockTracking, error: null });

      const result = await service.trackSubstanceUse('vaping', 3, 'Stressed about exam');

      expect(result.substance_type).toBe('vaping');
      expect(result.count).toBe(3);
    });
  });

  describe('getRecoveryStrategies', () => {
    it('should return recovery strategies for missed morning routine', async () => {
      const strategies = await service.getRecoveryStrategies('morning_routine');

      expect(strategies).toBeInstanceOf(Array);
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies[0]).toContain('essentials');
    });

    it('should return recovery strategies for missed gym', async () => {
      const strategies = await service.getRecoveryStrategies('gym');

      expect(strategies).toBeInstanceOf(Array);
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('should return default strategies for unknown activity', async () => {
      const strategies = await service.getRecoveryStrategies('unknown_activity');

      expect(strategies).toBeInstanceOf(Array);
      expect(strategies.length).toBeGreaterThan(0);
    });
  });

  describe('getRoutineStats', () => {
    it('should calculate routine completion statistics', async () => {
      const mockCompletions = [
        { completed_at: new Date().toISOString() },
        { completed_at: new Date(Date.now() - 86400000).toISOString() },
        { completed_at: new Date(Date.now() - 172800000).toISOString() },
      ];

      const mockMisses = [
        { recorded_at: new Date(Date.now() - 259200000).toISOString() },
      ];

      const mockQuery = mockSupabase.from('uk_student_routine_completions') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.gte.mockResolvedValue({ data: mockCompletions, error: null });

      const mockQuery2 = mockSupabase.from('uk_student_routine_misses') as any;
      mockQuery2.select.mockReturnThis();
      mockQuery2.eq.mockReturnThis();
      mockQuery2.eq.mockReturnThis();
      mockQuery2.gte.mockResolvedValue({ data: mockMisses, error: null });

      const result = await service.getRoutineStats('routine-1', 30);

      expect(result).toHaveProperty('total_days');
      expect(result).toHaveProperty('completed_days');
      expect(result).toHaveProperty('missed_days');
      expect(result).toHaveProperty('completion_rate');
      expect(result).toHaveProperty('consistency_score');
    });
  });

  describe('getDailyPlan', () => {
    it('should return daily plan with routines and academic events', async () => {
      const mockRoutines: RoutineType[] = [
        {
          id: 'routine-1',
          user_id: userId,
          routine_type: 'morning',
          name: 'Morning',
          steps: [],
          estimated_duration: 30,
          frequency: 'daily',
          completion_streak: 0,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const mockAcademicEvents = [
        {
          id: 'event-1',
          user_id: userId,
          title: 'EMH Lecture',
          type: 'class',
          start_time: new Date(),
          importance: 3,
        },
      ];

      const mockCompletions = [];

      const mockQuery = mockSupabase.from('uk_student_routines') as any;
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.order.mockResolvedValue({ data: mockRoutines, error: null });

      const mockQuery2 = mockSupabase.from('uk_student_academic_events') as any;
      mockQuery2.select.mockReturnThis();
      mockQuery2.eq.mockReturnThis();
      mockQuery2.gte.mockReturnThis();
      mockQuery2.lt.mockResolvedValue({ data: mockAcademicEvents, error: null });

      const mockQuery3 = mockSupabase.from('uk_student_routine_completions') as any;
      mockQuery3.select.mockReturnThis();
      mockQuery3.eq.mockReturnThis();
      mockQuery3.gte.mockReturnThis();
      mockQuery3.lt.mockResolvedValue({ data: mockCompletions, error: null });

      const result = await service.getDailyPlan(new Date());

      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('routines');
      expect(result).toHaveProperty('academic_events');
      expect(result).toHaveProperty('total_planned_time');
    });
  });
});
