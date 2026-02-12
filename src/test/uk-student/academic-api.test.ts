// Academic API Tests
// Tests for academic API endpoints

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { APIRoute } from 'astro';

// Mock dependencies
vi.mock('../../lib/auth/simple-multi-user', () => ({
  createServerAuth: vi.fn(() => ({
    getUser: vi.fn(() => Promise.resolve({ id: 'user-123', email: 'test@example.com' }))
  }))
}));

vi.mock('../../lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'assignment-123',
              title: 'Test Assignment',
              course_code: 'TEST101'
            },
            error: null
          }))
        }))
      }))
    }))
  }))
}));

vi.mock('../../lib/uk-student/academic-service', () => ({
  AcademicService: {
    getAssignments: vi.fn(() => Promise.resolve([
      {
        id: 'assignment-1',
        title: 'Test Assignment 1',
        course_code: 'TEST101',
        status: 'in_progress'
      }
    ])),
    getAssignment: vi.fn(() => Promise.resolve({
      id: 'assignment-123',
      title: 'Test Assignment',
      course_code: 'TEST101'
    })),
    getStudySessions: vi.fn(() => Promise.resolve([
      {
        id: 'session-1',
        title: 'Study Session 1',
        session_type: 'reading'
      }
    ])),
    getAcademicDashboard: vi.fn(() => Promise.resolve({
      upcoming_deadlines: [],
      current_assignments: [],
      today_study_sessions: [],
      weekly_progress: {
        total_hours_planned: 20,
        total_hours_completed: 15,
        completion_rate: 0.75
      },
      urgent_tasks: [],
      study_recommendations: []
    })),
    createAssignment: vi.fn(() => Promise.resolve({
      id: 'new-assignment-123',
      title: 'New Assignment',
      course_code: 'TEST101'
    })),
    breakdownAssignment: vi.fn(() => Promise.resolve({
      assignment_id: 'assignment-123',
      tasks: [
        {
          title: 'Research and Reading',
          description: 'Gather sources and read materials',
          estimated_duration: 180,
          priority: 'high'
        }
      ],
      total_estimated_hours: 3,
      suggested_schedule: []
    })),
    createStudySession: vi.fn(() => Promise.resolve({
      id: 'session-123',
      title: 'New Study Session',
      session_type: 'writing'
    })),
    updateAssignmentProgress: vi.fn(() => Promise.resolve()),
    updateAssignment: vi.fn(() => Promise.resolve({
      id: 'assignment-123',
      title: 'Updated Assignment'
    }))
  }
}));

// Import the API routes after mocking
import { GET, POST, PUT } from '../../../pages/api/uk-student/academic';

describe('Academic API', () => {
  let mockCookies: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn()
    };
  });

  describe('GET /api/uk-student/academic', () => {
    it('should get assignments successfully', async () => {
      const request = new Request('http://localhost/api/uk-student/academic?action=assignments');
      
      const response = await GET({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assignments).toBeDefined();
      expect(Array.isArray(data.assignments)).toBe(true);
    });

    it('should get assignments with filters', async () => {
      const request = new Request(
        'http://localhost/api/uk-student/academic?action=assignments&status=in_progress&course_code=TEST101'
      );
      
      const response = await GET({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assignments).toBeDefined();
    });

    it('should get single assignment by ID', async () => {
      const request = new Request(
        'http://localhost/api/uk-student/academic?action=assignment&id=assignment-123'
      );
      
      const response = await GET({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assignment).toBeDefined();
      expect(data.assignment.id).toBe('assignment-123');
    });

    it('should return 400 for assignment without ID', async () => {
      const request = new Request(
        'http://localhost/api/uk-student/academic?action=assignment'
      );
      
      const response = await GET({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Assignment ID required');
    });

    it('should get study sessions successfully', async () => {
      const request = new Request(
        'http://localhost/api/uk-student/academic?action=study-sessions'
      );
      
      const response = await GET({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.sessions).toBeDefined();
      expect(Array.isArray(data.sessions)).toBe(true);
    });

    it('should get dashboard data successfully', async () => {
      const request = new Request(
        'http://localhost/api/uk-student/academic?action=dashboard'
      );
      
      const response = await GET({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.upcoming_deadlines).toBeDefined();
      expect(data.data.current_assignments).toBeDefined();
      expect(data.data.weekly_progress).toBeDefined();
    });

    it('should return 400 for invalid action', async () => {
      const request = new Request(
        'http://localhost/api/uk-student/academic?action=invalid'
      );
      
      const response = await GET({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid action');
    });
  });

  describe('POST /api/uk-student/academic', () => {
    it('should create assignment successfully', async () => {
      const requestBody = {
        action: 'create-assignment',
        assignment: {
          title: 'New Assignment',
          course_code: 'TEST101',
          course_name: 'Test Course',
          assignment_type: 'essay',
          deadline: '2024-12-01T23:59:59Z'
        }
      };

      const request = new Request('http://localhost/api/uk-student/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const response = await POST({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.assignment).toBeDefined();
    });

    it('should return 400 for assignment with missing required fields', async () => {
      const requestBody = {
        action: 'create-assignment',
        assignment: {
          title: 'Incomplete Assignment'
          // Missing course_code and deadline
        }
      };

      const request = new Request('http://localhost/api/uk-student/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const response = await POST({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should breakdown assignment successfully', async () => {
      const requestBody = {
        action: 'breakdown_assignment',
        assignment_id: 'assignment-123',
        preferences: {
          daily_study_hours: 3,
          preferred_session_duration: 90
        }
      };

      const request = new Request('http://localhost/api/uk-student/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const response = await POST({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.assignment_id).toBe('assignment-123');
      expect(data.data.tasks).toBeDefined();
      expect(Array.isArray(data.data.tasks)).toBe(true);
    });

    it('should return 400 for breakdown without assignment ID', async () => {
      const requestBody = {
        action: 'breakdown_assignment'
        // Missing assignment_id
      };

      const request = new Request('http://localhost/api/uk-student/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const response = await POST({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Assignment ID required');
    });

    it('should create study session successfully', async () => {
      const requestBody = {
        action: 'create-study-session',
        session: {
          title: 'New Study Session',
          session_type: 'writing',
          planned_duration: 90,
          assignment_id: 'assignment-123'
        }
      };

      const request = new Request('http://localhost/api/uk-student/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const response = await POST({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.session).toBeDefined();
    });

    it('should update assignment progress successfully', async () => {
      const requestBody = {
        action: 'update-progress',
        assignment_id: 'assignment-123',
        progress: {
          completion_percentage: 50,
          hours_spent: 5,
          notes: 'Good progress made'
        }
      };

      const request = new Request('http://localhost/api/uk-student/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const response = await POST({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('PUT /api/uk-student/academic', () => {
    it('should update assignment successfully', async () => {
      const requestBody = {
        assignment_id: 'assignment-123',
        updates: {
          title: 'Updated Assignment Title',
          status: 'in_progress'
        }
      };

      const request = new Request('http://localhost/api/uk-student/academic', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const response = await PUT({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.assignment).toBeDefined();
    });

    it('should return 400 for update without assignment ID', async () => {
      const requestBody = {
        updates: {
          title: 'Updated Title'
        }
        // Missing assignment_id
      };

      const request = new Request('http://localhost/api/uk-student/academic', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const response = await PUT({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Assignment ID required');
    });
  });

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      // Mock unauthenticated user
      const { createServerAuth } = await import('../../lib/auth/simple-multi-user');
      vi.mocked(createServerAuth).mockReturnValue({
        getUser: vi.fn(() => Promise.resolve(null))
      } as any);

      const request = new Request('http://localhost/api/uk-student/academic?action=assignments');
      
      const response = await GET({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Mock service to throw error
      const { AcademicService } = await import('../../lib/uk-student/academic-service');
      vi.mocked(AcademicService.getAssignments).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new Request('http://localhost/api/uk-student/academic?action=assignments');
      
      const response = await GET({ request, cookies: mockCookies });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.details).toBe('Database connection failed');
    });
  });
});