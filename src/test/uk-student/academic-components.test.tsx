// Academic Components Tests
// Tests for academic dashboard and assignment breakdown components

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AcademicDashboard } from '../../components/uk-student/AcademicDashboard';
import AssignmentBreakdownComponent from '../../components/uk-student/AssignmentBreakdown';
import type { Assignment, AcademicDashboardData } from '../../types/uk-student-academic';

// Mock fetch
global.fetch = vi.fn();

describe('AcademicDashboard', () => {
  const mockDashboardData: AcademicDashboardData = {
    upcoming_deadlines: [
      {
        assignment_id: 'assignment-1',
        title: 'EMH Essay',
        course_name: 'Corporate Finance',
        deadline: '2024-11-24T23:59:59Z',
        days_remaining: 11,
        urgency_level: 'high',
        completion_percentage: 25,
        estimated_hours_remaining: 12
      }
    ],
    current_assignments: [
      {
        id: 'assignment-1',
        user_id: 'user-123',
        title: 'EMH Essay',
        course_code: 'FIN301',
        course_name: 'Corporate Finance',
        assignment_type: 'essay',
        word_count: 2000,
        current_word_count: 500,
        deadline: '2024-11-24T23:59:59Z',
        status: 'in_progress',
        priority: 'high',
        estimated_hours: 15,
        actual_hours: 3,
        created_at: '2024-11-13T10:00:00Z',
        updated_at: '2024-11-13T10:00:00Z'
      }
    ],
    today_study_sessions: [
      {
        id: 'session-1',
        user_id: 'user-123',
        session_type: 'writing',
        title: 'Essay Writing Session',
        planned_duration: 90,
        start_time: '2024-11-13T14:00:00Z',
        completed: false,
        created_at: '2024-11-13T10:00:00Z'
      }
    ],
    weekly_progress: {
      total_hours_planned: 20,
      total_hours_completed: 15,
      assignments_on_track: 2,
      assignments_behind: 1,
      completion_rate: 0.75
    },
    urgent_tasks: [],
    study_recommendations: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dashboard with loading state initially', () => {
    vi.mocked(fetch).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(<AcademicDashboard userId="user-123" />);

    expect(screen.getByText('Loading academic dashboard...')).toBeInTheDocument();
  });

  it('should render dashboard data successfully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockDashboardData })
    } as Response);

    render(<AcademicDashboard userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('Academic Dashboard')).toBeInTheDocument();
    });

    // Check quick stats - be more specific to avoid multiple matches
    expect(screen.getByText('Active Assignments')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument(); // Weekly progress

    // Check upcoming deadlines
    expect(screen.getByText('EMH Essay')).toBeInTheDocument();
    expect(screen.getByText('Corporate Finance')).toBeInTheDocument();
    expect(screen.getByText('11 days remaining')).toBeInTheDocument();

    // Check current assignments
    expect(screen.getByText('500 / 2000 words')).toBeInTheDocument();
    expect(screen.getByText('in progress')).toBeInTheDocument();

    // Check today's study sessions
    expect(screen.getByText('Essay Writing Session')).toBeInTheDocument();
    expect(screen.getByText('writing • 90 min')).toBeInTheDocument();
  });

  it('should handle API error gracefully', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false, error: 'Database error' })
    } as Response);

    render(<AcademicDashboard userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('Error loading dashboard')).toBeInTheDocument();
      expect(screen.getByText('Database error')).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('should retry loading on error', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false, error: 'Network error' })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockDashboardData })
      } as Response);

    render(<AcademicDashboard userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('Try again')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Try again'));

    await waitFor(() => {
      expect(screen.getByText('Academic Dashboard')).toBeInTheDocument();
    });
  });

  it('should display empty states correctly', async () => {
    const emptyDashboardData: AcademicDashboardData = {
      upcoming_deadlines: [],
      current_assignments: [],
      today_study_sessions: [],
      weekly_progress: {
        total_hours_planned: 0,
        total_hours_completed: 0,
        assignments_on_track: 0,
        assignments_behind: 0,
        completion_rate: 0
      },
      urgent_tasks: [],
      study_recommendations: []
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: emptyDashboardData })
    } as Response);

    render(<AcademicDashboard userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('No upcoming deadlines')).toBeInTheDocument();
      expect(screen.getByText('No active assignments')).toBeInTheDocument();
      expect(screen.getByText('No study sessions scheduled for today')).toBeInTheDocument();
    });
  });

  it('should show correct urgency colors for deadlines', async () => {
    const urgentDeadlineData: AcademicDashboardData = {
      ...mockDashboardData,
      upcoming_deadlines: [
        {
          assignment_id: 'assignment-1',
          title: 'Urgent Assignment',
          course_name: 'Test Course',
          deadline: '2024-11-14T23:59:59Z',
          days_remaining: 1,
          urgency_level: 'critical',
          completion_percentage: 10,
          estimated_hours_remaining: 20
        }
      ]
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: urgentDeadlineData })
    } as Response);

    render(<AcademicDashboard userId="user-123" />);

    await waitFor(() => {
      expect(screen.getByText('1 days remaining')).toBeInTheDocument();
    });

    // Should have red styling for critical urgency - check the parent container
    const deadlineCard = screen.getByText('Urgent Assignment').closest('.text-red-600');
    expect(deadlineCard).toBeInTheDocument();
  });
});

describe('AssignmentBreakdownComponent', () => {
  const mockAssignment: Assignment = {
    id: 'assignment-123',
    user_id: 'user-123',
    title: 'EMH Essay',
    description: 'Efficient Market Hypothesis analysis',
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

  const mockBreakdown = {
    assignment_id: 'assignment-123',
    tasks: [
      {
        title: 'Research and Reading',
        description: 'Gather sources and read materials',
        estimated_duration: 180,
        priority: 'high',
        complexity: 'moderate',
        energy_required: 'medium',
        deadline_offset_days: 7
      },
      {
        title: 'Create Outline',
        description: 'Structure arguments and create outline',
        estimated_duration: 90,
        priority: 'high',
        complexity: 'moderate',
        energy_required: 'high',
        dependencies: ['Research and Reading'],
        deadline_offset_days: 5
      }
    ],
    total_estimated_hours: 4.5,
    suggested_schedule: [
      {
        date: '2024-11-14',
        start_time: '09:00',
        end_time: '12:00',
        task_title: 'Research and Reading',
        session_type: 'research',
        energy_level: 'medium'
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render assignment information', () => {
    render(<AssignmentBreakdownComponent assignment={mockAssignment} />);

    expect(screen.getByText('Assignment Breakdown')).toBeInTheDocument();
    expect(screen.getByText('EMH Essay')).toBeInTheDocument();
    expect(screen.getByText('Corporate Finance • essay')).toBeInTheDocument();
    expect(screen.getByText('2000 words')).toBeInTheDocument();
    expect(screen.getByText('15h estimated')).toBeInTheDocument();
  });

  it('should render preferences form', () => {
    render(<AssignmentBreakdownComponent assignment={mockAssignment} />);

    expect(screen.getByLabelText('Daily Study Hours')).toBeInTheDocument();
    expect(screen.getByLabelText('Session Duration (minutes)')).toBeInTheDocument();
    expect(screen.getByLabelText('Avoid weekends')).toBeInTheDocument();
    expect(screen.getByLabelText('Prefer morning sessions')).toBeInTheDocument();
  });

  it('should update preferences when form inputs change', () => {
    render(<AssignmentBreakdownComponent assignment={mockAssignment} />);

    const dailyHoursInput = screen.getByLabelText('Daily Study Hours') as HTMLInputElement;
    fireEvent.change(dailyHoursInput, { target: { value: '4' } });
    expect(dailyHoursInput.value).toBe('4');

    const sessionDurationSelect = screen.getByLabelText('Session Duration (minutes)') as HTMLSelectElement;
    fireEvent.change(sessionDurationSelect, { target: { value: '120' } });
    expect(sessionDurationSelect.value).toBe('120');

    const avoidWeekendsCheckbox = screen.getByLabelText('Avoid weekends') as HTMLInputElement;
    fireEvent.click(avoidWeekendsCheckbox);
    expect(avoidWeekendsCheckbox.checked).toBe(true);
  });

  it('should call breakdown API when button is clicked', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockBreakdown })
    } as Response);

    const onBreakdownComplete = vi.fn();
    render(
      <AssignmentBreakdownComponent 
        assignment={mockAssignment} 
        onBreakdownComplete={onBreakdownComplete}
      />
    );

    fireEvent.click(screen.getByText('Break Down Assignment'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/uk-student/academic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'breakdown_assignment',
          assignment_id: 'assignment-123',
          preferences: {
            daily_study_hours: 3,
            preferred_session_duration: 90,
            avoid_weekends: false,
            morning_person: true
          }
        })
      });
    });

    expect(onBreakdownComplete).toHaveBeenCalledWith(mockBreakdown);
  });

  it('should show loading state during breakdown', async () => {
    vi.mocked(fetch).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(<AssignmentBreakdownComponent assignment={mockAssignment} />);

    fireEvent.click(screen.getByText('Break Down Assignment'));

    expect(screen.getByText('Breaking down assignment...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should display breakdown results', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockBreakdown })
    } as Response);

    render(<AssignmentBreakdownComponent assignment={mockAssignment} />);

    fireEvent.click(screen.getByText('Break Down Assignment'));

    await waitFor(() => {
      expect(screen.getByText('Task Breakdown')).toBeInTheDocument();
    });

    // Check task overview stats
    expect(screen.getByText('2')).toBeInTheDocument(); // Total tasks
    expect(screen.getByText('5h')).toBeInTheDocument(); // Total hours (rounded)
    expect(screen.getByText('1')).toBeInTheDocument(); // Study sessions

    // Check individual tasks
    expect(screen.getByText('Research and Reading')).toBeInTheDocument();
    expect(screen.getByText('Create Outline')).toBeInTheDocument();
    expect(screen.getByText('3h 0m')).toBeInTheDocument(); // Duration for first task
    expect(screen.getByText('Depends on: Research and Reading')).toBeInTheDocument();

    // Check study schedule
    expect(screen.getByText('Suggested Study Schedule')).toBeInTheDocument();
    expect(screen.getByText('Thu, Nov 14')).toBeInTheDocument();
    expect(screen.getByText('09:00 - 12:00')).toBeInTheDocument();
  });

  it('should handle breakdown API error', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false, error: 'Assignment not found' })
    } as Response);

    render(<AssignmentBreakdownComponent assignment={mockAssignment} />);

    fireEvent.click(screen.getByText('Break Down Assignment'));

    await waitFor(() => {
      expect(screen.getByText('Assignment not found')).toBeInTheDocument();
    });
  });

  it('should display task priorities with correct colors', async () => {
    const breakdownWithPriorities = {
      ...mockBreakdown,
      tasks: [
        {
          ...mockBreakdown.tasks[0],
          priority: 'urgent'
        },
        {
          ...mockBreakdown.tasks[1],
          priority: 'low'
        }
      ]
    };

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: breakdownWithPriorities })
    } as Response);

    render(<AssignmentBreakdownComponent assignment={mockAssignment} />);

    fireEvent.click(screen.getByText('Break Down Assignment'));

    await waitFor(() => {
      const urgentTag = screen.getByText('urgent');
      const lowTag = screen.getByText('low');
      
      expect(urgentTag).toHaveClass('text-red-800');
      expect(lowTag).toHaveClass('text-gray-800');
    });
  });

  it('should display session types with correct colors', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockBreakdown })
    } as Response);

    render(<AssignmentBreakdownComponent assignment={mockAssignment} />);

    fireEvent.click(screen.getByText('Break Down Assignment'));

    await waitFor(() => {
      const researchTag = screen.getByText('research');
      expect(researchTag).toHaveClass('text-blue-800');
    });
  });
});