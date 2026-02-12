// Academic Service Tests
// Tests for assignment management, study sessions, and academic progress tracking

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { 
  Assignment, 
  CreateAssignmentRequest, 
  AssignmentBreakdownRequest,
  CreateStudySessionRequest 
} from '../../types/uk-student-academic';

// Mock Supabase client first
vi.mock('../../lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn()
          })),
          order: vi.fn(),
          gte: vi.fn(() => ({
            lte: vi.fn(() => ({
              order: vi.fn()
            }))
          })),
          lt: vi.fn(() => ({
            order: vi.fn()
          })),
          gt: vi.fn(() => ({
            order: vi.fn()
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn()
            }))
          }))
        }))
      })),
      upsert: vi.fn()
    }))
  }
}));

// Mock TaskService
vi.mock('../../lib/task-management/task-service', () => ({
  TaskService: {
    createTask: vi.fn(() => Promise.resolve({
      id: 'task-123',
      title: 'Test Task',
      description: 'Test Description',
      status: 'pending'
    }))
  }
}));

// Import after mocking
import { AcademicService } from '../../lib/uk-student/academic-service';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        })),
        order: vi.fn(() => ({
          // For getAssignments
        })),
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            order: vi.fn()
          }))
        })),
        lt: vi.fn(() => ({
          order: vi.fn()
        })),
        gt: vi.fn(() => ({
          order: vi.fn()
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    })),
    upsert: vi.fn()
  }))
};

// Mock TaskService
vi.mock('../../lib/task-management/task-service', () => ({
  TaskService: {
    createTask: vi.fn(() => Promise.resolve({
      id: 'task-123',
      title: 'Test Task',
      description: 'Test Description',
      status: 'pending'
    }))
  }
}));

describe('AcademicService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Assignment Management', () => {
    it('should create an assignment successfully', async () => {
      const mockAssignment: Assignment = {
        id: 'assignment-123',
        user_id: 'user-123',
        title: 'EMH Essay',
        description: 'Efficient Market Hypothesis analysis',
        course_code: 'FIN301',
        course_name: 'Corporate Finance',
        assignment_type: 'essay',
        word_count: 2000,
        current_word_count: 0,
        deadline: '2024-11-24T23:59:59Z',
        status: 'not_started',
        priority: 'high',
        estimated_hours: 15,
        actual_hours: 0,
        created_at: '2024-11-13T10:00:00Z',
        updated_at: '2024-11-13T10:00:00Z'
      };

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockAssignment,
        error: null
      });

      const assignmentData: CreateAssignmentRequest = {
        title: 'EMH Essay',
        description: 'Efficient Market Hypothesis analysis',
        course_code: 'FIN301',
        course_name: 'Corporate Finance',
        assignment_type: 'essay',
        word_count: 2000,
        deadline: '2024-11-24T23:59:59Z'
      };

      const result = await AcademicService.createAssignment(
        'user-123', 
        assignmentData, 
        mockSupabaseClient as any
      );

      expect(result).toEqual(mockAssignment);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('assignments');
    });

    it('should estimate assignment hours correctly for essays', async () => {
      const assignmentData: CreateAssignmentRequest = {
        title: 'Test Essay',
        course_code: 'TEST101',
        course_name: 'Test Course',
        assignment_type: 'essay',
        word_count: 2000,
        deadline: '2024-12-01T23:59:59Z'
      };

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: { ...assignmentData, id: 'test-123', estimated_hours: 15 },
        error: null
      });

      await AcademicService.createAssignment('user-123', assignmentData, mockSupabaseClient as any);

      // Should call insert with estimated_hours calculated from word count
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          estimated_hours: expect.any(Number)
        })
      );
    });

    it('should get assignment by ID', async () => {
      const mockAssignment: Assignment = {
        id: 'assignment-123',
        user_id: 'user-123',
        title: 'Test Assignment',
        course_code: 'TEST101',
        course_name: 'Test Course',
        assignment_type: 'essay',
        deadline: '2024-12-01T23:59:59Z',
        status: 'in_progress',
        priority: 'medium',
        estimated_hours: 10,
        created_at: '2024-11-13T10:00:00Z',
        updated_at: '2024-11-13T10:00:00Z'
      };

      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: mockAssignment,
        error: null
      });

      const result = await AcademicService.getAssignment(
        'user-123', 
        'assignment-123', 
        mockSupabaseClient as any
      );

      expect(result).toEqual(mockAssignment);
    });

    it('should return null for non-existent assignment', async () => {
      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await AcademicService.getAssignment(
        'user-123', 
        'non-existent', 
        mockSupabaseClient as any
      );

      expect(result).toBeNull();
    });

    it('should get assignments with filters', async () => {
      const mockAssignments: Assignment[] = [
        {
          id: 'assignment-1',
          user_id: 'user-123',
          title: 'Assignment 1',
          course_code: 'FIN301',
          course_name: 'Finance',
          assignment_type: 'essay',
          deadline: '2024-11-24T23:59:59Z',
          status: 'in_progress',
          priority: 'high',
          estimated_hours: 15,
          created_at: '2024-11-13T10:00:00Z',
          updated_at: '2024-11-13T10:00:00Z'
        }
      ];

      const mockQuery = {
        eq: vi.fn(() => mockQuery),
        lt: vi.fn(() => mockQuery),
        gt: vi.fn(() => mockQuery),
        order: vi.fn(() => Promise.resolve({ data: mockAssignments, error: null }))
      };

      mockSupabaseClient.from().select.mockReturnValue(mockQuery);

      const result = await AcademicService.getAssignments(
        'user-123',
        { status: 'in_progress', course_code: 'FIN301' },
        mockSupabaseClient as any
      );

      expect(result).toEqual(mockAssignments);
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'in_progress');
      expect(mockQuery.eq).toHaveBeenCalledWith('course_code', 'FIN301');
    });
  });

  describe('Assignment Breakdown', () => {
    it('should break down essay assignment into tasks', async () => {
      const mockAssignment: Assignment = {
        id: 'assignment-123',
        user_id: 'user-123',
        title: 'EMH Essay',
        course_code: 'FIN301',
        course_name: 'Corporate Finance',
        assignment_type: 'essay',
        word_count: 2000,
        deadline: '2024-11-24T23:59:59Z',
        status: 'not_started',
        priority: 'high',
        estimated_hours: 15,
        created_at: '2024-11-13T10:00:00Z',
        updated_at: '2024-11-13T10:00:00Z'
      };

      // Mock getAssignment
      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: mockAssignment,
        error: null
      });

      // Mock linkTaskToAssignment
      mockSupabaseClient.from().insert.mockResolvedValue({
        data: null,
        error: null
      });

      const request: AssignmentBreakdownRequest = {
        assignment_id: 'assignment-123',
        preferences: {
          daily_study_hours: 3,
          preferred_session_duration: 90,
          morning_person: true
        }
      };

      const result = await AcademicService.breakdownAssignment(
        'user-123',
        request,
        mockSupabaseClient as any
      );

      expect(result.assignment_id).toBe('assignment-123');
      expect(result.tasks).toHaveLength(5); // Essay should have 5 tasks
      expect(result.tasks[0].title).toBe('Research and Reading');
      expect(result.tasks[1].title).toBe('Create Outline');
      expect(result.tasks[2].title).toBe('Write First Draft');
      expect(result.tasks[3].title).toBe('Review and Edit');
      expect(result.tasks[4].title).toBe('Final Proofreading');
      expect(result.total_estimated_hours).toBeGreaterThan(0);
      expect(result.suggested_schedule).toBeDefined();
    });

    it('should generate appropriate study schedule', async () => {
      const mockAssignment: Assignment = {
        id: 'assignment-123',
        user_id: 'user-123',
        title: 'Test Essay',
        course_code: 'TEST101',
        course_name: 'Test Course',
        assignment_type: 'essay',
        deadline: '2024-12-01T23:59:59Z',
        status: 'not_started',
        priority: 'medium',
        estimated_hours: 10,
        created_at: '2024-11-13T10:00:00Z',
        updated_at: '2024-11-13T10:00:00Z'
      };

      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: mockAssignment,
        error: null
      });

      mockSupabaseClient.from().insert.mockResolvedValue({
        data: null,
        error: null
      });

      const request: AssignmentBreakdownRequest = {
        assignment_id: 'assignment-123',
        preferences: {
          daily_study_hours: 2,
          preferred_session_duration: 120,
          morning_person: false
        }
      };

      const result = await AcademicService.breakdownAssignment(
        'user-123',
        request,
        mockSupabaseClient as any
      );

      expect(result.suggested_schedule).toBeDefined();
      expect(result.suggested_schedule.length).toBeGreaterThan(0);
      
      // Check that schedule blocks have required properties
      const firstBlock = result.suggested_schedule[0];
      expect(firstBlock).toHaveProperty('date');
      expect(firstBlock).toHaveProperty('start_time');
      expect(firstBlock).toHaveProperty('end_time');
      expect(firstBlock).toHaveProperty('task_title');
      expect(firstBlock).toHaveProperty('session_type');
    });
  });

  describe('Study Sessions', () => {
    it('should create study session successfully', async () => {
      const mockSession = {
        id: 'session-123',
        user_id: 'user-123',
        assignment_id: 'assignment-123',
        session_type: 'writing',
        title: 'Essay Writing Session',
        planned_duration: 90,
        completed: false,
        created_at: '2024-11-13T10:00:00Z'
      };

      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: mockSession,
        error: null
      });

      const sessionData: CreateStudySessionRequest = {
        assignment_id: 'assignment-123',
        session_type: 'writing',
        title: 'Essay Writing Session',
        planned_duration: 90
      };

      const result = await AcademicService.createStudySession(
        'user-123',
        sessionData,
        mockSupabaseClient as any
      );

      expect(result).toEqual(mockSession);
    });

    it('should get study sessions with filters', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          user_id: 'user-123',
          assignment_id: 'assignment-123',
          session_type: 'reading',
          title: 'Research Session',
          planned_duration: 60,
          completed: true,
          created_at: '2024-11-13T09:00:00Z'
        }
      ];

      const mockQuery = {
        eq: vi.fn(() => mockQuery),
        gte: vi.fn(() => mockQuery),
        lte: vi.fn(() => mockQuery),
        order: vi.fn(() => Promise.resolve({ data: mockSessions, error: null }))
      };

      mockSupabaseClient.from().select.mockReturnValue(mockQuery);

      const result = await AcademicService.getStudySessions(
        'user-123',
        { assignment_id: 'assignment-123' },
        mockSupabaseClient as any
      );

      expect(result).toEqual(mockSessions);
      expect(mockQuery.eq).toHaveBeenCalledWith('assignment_id', 'assignment-123');
    });
  });

  describe('Academic Dashboard', () => {
    it('should get dashboard data successfully', async () => {
      // Mock assignments
      const mockAssignments = [
        {
          id: 'assignment-1',
          user_id: 'user-123',
          title: 'Test Assignment',
          course_code: 'TEST101',
          course_name: 'Test Course',
          assignment_type: 'essay',
          deadline: '2024-11-24T23:59:59Z',
          status: 'in_progress',
          priority: 'high',
          estimated_hours: 10,
          created_at: '2024-11-13T10:00:00Z',
          updated_at: '2024-11-13T10:00:00Z'
        }
      ];

      // Mock study sessions
      const mockSessions = [
        {
          id: 'session-1',
          user_id: 'user-123',
          session_type: 'writing',
          title: 'Writing Session',
          planned_duration: 90,
          completed: false,
          created_at: '2024-11-13T10:00:00Z'
        }
      ];

      const mockQuery = {
        eq: vi.fn(() => mockQuery),
        gte: vi.fn(() => mockQuery),
        lte: vi.fn(() => mockQuery),
        lt: vi.fn(() => mockQuery),
        order: vi.fn(() => Promise.resolve({ 
          data: mockAssignments, 
          error: null 
        }))
      };

      const mockSessionQuery = {
        eq: vi.fn(() => mockSessionQuery),
        gte: vi.fn(() => mockSessionQuery),
        lte: vi.fn(() => mockSessionQuery),
        order: vi.fn(() => Promise.resolve({ 
          data: mockSessions, 
          error: null 
        }))
      };

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'assignments') {
          return { select: vi.fn(() => mockQuery) };
        } else if (table === 'study_sessions') {
          return { select: vi.fn(() => mockSessionQuery) };
        }
        return { select: vi.fn(() => mockQuery) };
      });

      const result = await AcademicService.getAcademicDashboard(
        'user-123',
        mockSupabaseClient as any
      );

      expect(result).toHaveProperty('upcoming_deadlines');
      expect(result).toHaveProperty('current_assignments');
      expect(result).toHaveProperty('today_study_sessions');
      expect(result).toHaveProperty('weekly_progress');
      expect(result).toHaveProperty('urgent_tasks');
      expect(result).toHaveProperty('study_recommendations');
      
      expect(result.current_assignments).toEqual(mockAssignments);
      expect(result.today_study_sessions).toEqual(mockSessions);
    });
  });

  describe('Progress Tracking', () => {
    it('should update assignment progress successfully', async () => {
      mockSupabaseClient.from().upsert.mockResolvedValue({
        data: null,
        error: null
      });

      // Mock updateAssignment for status update
      mockSupabaseClient.from().update().eq().eq().select().single.mockResolvedValue({
        data: { id: 'assignment-123', status: 'in_progress' },
        error: null
      });

      const progress = {
        completion_percentage: 25,
        hours_spent: 3,
        word_count_progress: 500,
        notes: 'Made good progress on research'
      };

      await AcademicService.updateAssignmentProgress(
        'user-123',
        'assignment-123',
        progress,
        mockSupabaseClient as any
      );

      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          assignment_id: 'assignment-123',
          completion_percentage: 25,
          hours_spent: 3,
          word_count_progress: 500,
          notes: 'Made good progress on research'
        })
      );
    });

    it('should update assignment status based on completion percentage', async () => {
      mockSupabaseClient.from().upsert.mockResolvedValue({
        data: null,
        error: null
      });

      mockSupabaseClient.from().update().eq().eq().select().single.mockResolvedValue({
        data: { id: 'assignment-123', status: 'draft_complete' },
        error: null
      });

      await AcademicService.updateAssignmentProgress(
        'user-123',
        'assignment-123',
        { completion_percentage: 100 },
        mockSupabaseClient as any
      );

      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'draft_complete' })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle assignment creation errors', async () => {
      mockSupabaseClient.from().insert().select().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      const assignmentData: CreateAssignmentRequest = {
        title: 'Test Assignment',
        course_code: 'TEST101',
        course_name: 'Test Course',
        assignment_type: 'essay',
        deadline: '2024-12-01T23:59:59Z'
      };

      await expect(
        AcademicService.createAssignment('user-123', assignmentData, mockSupabaseClient as any)
      ).rejects.toThrow('Failed to create assignment: Database error');
    });

    it('should handle assignment breakdown for non-existent assignment', async () => {
      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const request: AssignmentBreakdownRequest = {
        assignment_id: 'non-existent'
      };

      await expect(
        AcademicService.breakdownAssignment('user-123', request, mockSupabaseClient as any)
      ).rejects.toThrow('Assignment not found');
    });
  });
});