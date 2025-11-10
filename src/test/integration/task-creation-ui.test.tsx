import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TaskCreationModal from '../../components/tasks/TaskCreationModal';

// Mock fetch
global.fetch = vi.fn();

describe('Task Creation Modal', () => {
  const mockOnClose = vi.fn();
  const mockOnTaskCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the modal when open', () => {
    render(
      <TaskCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    expect(screen.getByText('Create New Task')).toBeInTheDocument();
    expect(screen.getByLabelText(/Task Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Priority/)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <TaskCreationModal
        isOpen={false}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    expect(screen.queryByText('Create New Task')).not.toBeInTheDocument();
  });

  it('should validate required fields', async () => {
    render(
      <TaskCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    const submitButton = screen.getByText('Create Task');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });
  });

  it('should submit valid task data', async () => {
    const mockTask = {
      id: '1',
      title: 'Test Task',
      category: 'Work',
      priority: 'medium',
      status: 'pending'
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ task: mockTask })
    });

    render(
      <TaskCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    // Fill in the form
    fireEvent.change(screen.getByLabelText(/Task Title/), {
      target: { value: 'Test Task' }
    });

    fireEvent.change(screen.getByLabelText(/Description/), {
      target: { value: 'Test description' }
    });

    fireEvent.change(screen.getByLabelText(/Category/), {
      target: { value: 'Work' }
    });

    fireEvent.change(screen.getByLabelText(/Priority/), {
      target: { value: 'high' }
    });

    // Submit the form
    const submitButton = screen.getByText('Create Task');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Task',
          description: 'Test description',
          category: 'Work',
          priority: 'high',
          complexity: 'moderate',
          energy_required: 'medium',
          created_from: 'manual'
        })
      });
    });

    await waitFor(() => {
      expect(mockOnTaskCreated).toHaveBeenCalledWith(mockTask);
    });
  });

  it('should handle API errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to create task' })
    });

    render(
      <TaskCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Task Title/), {
      target: { value: 'Test Task' }
    });

    // Submit the form
    const submitButton = screen.getByText('Create Task');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Should not call onTaskCreated on error
    expect(mockOnTaskCreated).not.toHaveBeenCalled();
  });

  it('should handle validation errors from API', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Validation failed',
        details: [
          { field: 'title', message: 'Title is too long' }
        ]
      })
    });

    render(
      <TaskCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    // Fill in a very long title
    fireEvent.change(screen.getByLabelText(/Task Title/), {
      target: { value: 'A'.repeat(300) }
    });

    // Submit the form
    const submitButton = screen.getByText('Create Task');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title must be 255 characters or less')).toBeInTheDocument();
    });
  });

  it('should close modal when cancel is clicked', () => {
    render(
      <TaskCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should close modal when X button is clicked', () => {
    render(
      <TaskCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    const closeButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show all form fields with correct default values', () => {
    render(
      <TaskCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    // Check all form fields are present
    expect(screen.getByLabelText(/Task Title/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Priority/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Complexity/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Energy Required/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Estimated Duration/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Deadline/)).toBeInTheDocument();

    // Check default values
    expect(screen.getByDisplayValue('Work')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Medium')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Moderate')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Medium Energy')).toBeInTheDocument();
  });

  it('should disable form during submission', async () => {
    (global.fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ task: { id: '1' } })
      }), 100))
    );

    render(
      <TaskCreationModal
        isOpen={true}
        onClose={mockOnClose}
        onTaskCreated={mockOnTaskCreated}
      />
    );

    // Fill in required fields
    fireEvent.change(screen.getByLabelText(/Task Title/), {
      target: { value: 'Test Task' }
    });

    // Submit the form
    const submitButton = screen.getByText('Create Task');
    fireEvent.click(submitButton);

    // Check that button shows loading state
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    
    // Check that form fields are disabled
    expect(screen.getByLabelText(/Task Title/)).toBeDisabled();
    expect(screen.getByLabelText(/Category/)).toBeDisabled();
  });
});