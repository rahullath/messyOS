import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskManagement from '../../components/tasks/TaskManagement';

// Mock fetch
global.fetch = vi.fn();

describe('Task Management Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete the full task creation and display workflow', async () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Test Task 1',
        description: 'Test description',
        category: 'Work',
        priority: 'high',
        status: 'pending',
        complexity: 'moderate',
        energy_required: 'medium',
        estimated_duration: 60,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        user_id: 'user1',
        created_from: 'manual',
        position: 0
      }
    ];

    const newTask = {
      id: '2',
      title: 'New Task',
      description: 'New task description',
      category: 'Personal',
      priority: 'medium',
      status: 'pending',
      complexity: 'simple',
      energy_required: 'low',
      estimated_duration: 30,
      created_at: '2024-01-01T11:00:00Z',
      updated_at: '2024-01-01T11:00:00Z',
      user_id: 'user1',
      created_from: 'manual',
      position: 0
    };

    // Mock initial tasks fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tasks: mockTasks,
        total: 1,
        page: 1,
        limit: 20
      })
    });

    render(<TaskManagement />);

    // Wait for initial tasks to load
    await waitFor(() => {
      expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    });

    // Verify task list displays correctly
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();

    // Click "New Task" button
    const newTaskButton = screen.getByText('New Task');
    fireEvent.click(newTaskButton);

    // Verify modal opens
    await waitFor(() => {
      expect(screen.getByText('Create New Task')).toBeInTheDocument();
    });

    // Mock task creation API call
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ task: newTask })
    });

    // Mock refreshed tasks fetch (after creation)
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tasks: [newTask, ...mockTasks],
        total: 2,
        page: 1,
        limit: 20
      })
    });

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/Task Title/), {
      target: { value: 'New Task' }
    });

    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'New task description' }
    });

    fireEvent.change(screen.getByLabelText(/Category/), {
      target: { value: 'Personal' }
    });

    fireEvent.change(screen.getByLabelText(/Priority/), {
      target: { value: 'medium' }
    });

    fireEvent.change(screen.getByLabelText(/Complexity/), {
      target: { value: 'simple' }
    });

    fireEvent.change(screen.getByLabelText(/Energy Required/), {
      target: { value: 'low' }
    });

    fireEvent.change(screen.getByLabelText(/Estimated Duration/), {
      target: { value: '30' }
    });

    // Submit the form
    const submitButton = screen.getByText('Create Task');
    fireEvent.click(submitButton);

    // Wait for task creation API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Task',
          description: 'New task description',
          category: 'Personal',
          priority: 'medium',
          complexity: 'simple',
          energy_required: 'low',
          estimated_duration: 30,
          created_from: 'manual'
        })
      });
    });

    // Wait for modal to close and task list to refresh
    await waitFor(() => {
      expect(screen.queryByText('Create New Task')).not.toBeInTheDocument();
    });

    // Verify new task appears in the list
    await waitFor(() => {
      expect(screen.getByText('New Task')).toBeInTheDocument();
    });

    expect(screen.getByText('Personal')).toBeInTheDocument();
    expect(screen.getByText('New task description')).toBeInTheDocument();
  });

  it('should handle task status updates', async () => {
    const mockTask = {
      id: '1',
      title: 'Test Task',
      category: 'Work',
      priority: 'medium',
      status: 'pending',
      complexity: 'moderate',
      energy_required: 'medium',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      user_id: 'user1',
      created_from: 'manual',
      position: 0
    };

    const updatedTask = { ...mockTask, status: 'in_progress' };

    // Mock initial tasks fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tasks: [mockTask],
        total: 1,
        page: 1,
        limit: 20
      })
    });

    render(<TaskManagement />);

    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    // Mock task update API call
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ task: updatedTask })
    });

    // Click "Start" button
    const startButton = screen.getByText('Start');
    fireEvent.click(startButton);

    // Verify API call was made
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks/1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'in_progress' })
      });
    });
  });

  it('should filter tasks correctly', async () => {
    const mockTasks = [
      {
        id: '1',
        title: 'Work Task',
        category: 'Work',
        priority: 'high',
        status: 'pending',
        complexity: 'moderate',
        energy_required: 'medium',
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        user_id: 'user1',
        created_from: 'manual',
        position: 0
      },
      {
        id: '2',
        title: 'Personal Task',
        category: 'Personal',
        priority: 'low',
        status: 'completed',
        complexity: 'simple',
        energy_required: 'low',
        created_at: '2024-01-01T11:00:00Z',
        updated_at: '2024-01-01T11:00:00Z',
        user_id: 'user1',
        created_from: 'manual',
        position: 0
      }
    ];

    // Mock initial tasks fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tasks: mockTasks,
        total: 2,
        page: 1,
        limit: 20
      })
    });

    render(<TaskManagement />);

    // Wait for tasks to load
    await waitFor(() => {
      expect(screen.getByText('Work Task')).toBeInTheDocument();
      expect(screen.getByText('Personal Task')).toBeInTheDocument();
    });

    // Mock filtered tasks fetch
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tasks: [mockTasks[0]], // Only work task
        total: 1,
        page: 1,
        limit: 20
      })
    });

    // Filter by category
    const categoryFilter = screen.getByDisplayValue('All Categories');
    fireEvent.change(categoryFilter, { target: { value: 'Work' } });

    // Verify filtered API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tasks?category=Work')
      );
    });
  });

  it('should handle loading and error states', async () => {
    // Mock failed API call
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<TaskManagement />);

    // Should show loading state initially
    expect(screen.getByText('Loading tasks...')).toBeInTheDocument();

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should show empty state when no tasks exist', async () => {
    // Mock empty tasks response
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        tasks: [],
        total: 0,
        page: 1,
        limit: 20
      })
    });

    render(<TaskManagement />);

    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByText('No tasks found')).toBeInTheDocument();
      expect(screen.getByText('Create your first task to get started!')).toBeInTheDocument();
    });
  });
});