// src/test/integration/enhanced-import-ui.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EnhancedLoopHabitsImport from '../../components/import/EnhancedLoopHabitsImport';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('Enhanced Loop Habits Import UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render file upload form initially', () => {
    render(<EnhancedLoopHabitsImport />);
    
    expect(screen.getByText('Enhanced Loop Habits Import')).toBeInTheDocument();
    expect(screen.getByLabelText(/Habits\.csv/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Checkmarks\.csv/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Scores\.csv/)).toBeInTheDocument();
    expect(screen.getByText('Start Enhanced Import')).toBeInTheDocument();
  });

  it('should disable import button when files are missing', () => {
    render(<EnhancedLoopHabitsImport />);
    
    const importButton = screen.getByText('Start Enhanced Import');
    expect(importButton).toBeDisabled();
  });

  it('should enable import button when all files are selected', async () => {
    render(<EnhancedLoopHabitsImport />);
    
    const habitsInput = screen.getByLabelText(/Habits\.csv/) as HTMLInputElement;
    const checkmarksInput = screen.getByLabelText(/Checkmarks\.csv/) as HTMLInputElement;
    const scoresInput = screen.getByLabelText(/Scores\.csv/) as HTMLInputElement;
    
    const habitsFile = new File(['test'], 'habits.csv', { type: 'text/csv' });
    const checkmarksFile = new File(['test'], 'checkmarks.csv', { type: 'text/csv' });
    const scoresFile = new File(['test'], 'scores.csv', { type: 'text/csv' });
    
    fireEvent.change(habitsInput, { target: { files: [habitsFile] } });
    fireEvent.change(checkmarksInput, { target: { files: [checkmarksFile] } });
    fireEvent.change(scoresInput, { target: { files: [scoresFile] } });
    
    await waitFor(() => {
      const importButton = screen.getByText('Start Enhanced Import');
      expect(importButton).not.toBeDisabled();
    });
  });

  it('should show file information when files are selected', async () => {
    render(<EnhancedLoopHabitsImport />);
    
    const habitsInput = screen.getByLabelText(/Habits\.csv/) as HTMLInputElement;
    const habitsFile = new File(['test content'], 'habits.csv', { type: 'text/csv' });
    
    fireEvent.change(habitsInput, { target: { files: [habitsFile] } });
    
    await waitFor(() => {
      expect(screen.getByText(/habits\.csv/)).toBeInTheDocument();
      expect(screen.getByText(/KB/)).toBeInTheDocument();
    });
  });

  it('should validate file sizes', async () => {
    render(<EnhancedLoopHabitsImport />);
    
    // Create a mock large file
    const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB
    const largeFile = new File([largeContent], 'habits.csv', { type: 'text/csv' });
    const normalFile = new File(['test'], 'checkmarks.csv', { type: 'text/csv' });
    
    const habitsInput = screen.getByLabelText(/Habits\.csv/) as HTMLInputElement;
    const checkmarksInput = screen.getByLabelText(/Checkmarks\.csv/) as HTMLInputElement;
    const scoresInput = screen.getByLabelText(/Scores\.csv/) as HTMLInputElement;
    
    fireEvent.change(habitsInput, { target: { files: [largeFile] } });
    fireEvent.change(checkmarksInput, { target: { files: [normalFile] } });
    fireEvent.change(scoresInput, { target: { files: [normalFile] } });
    
    const importButton = screen.getByText('Start Enhanced Import');
    fireEvent.click(importButton);
    
    await waitFor(() => {
      expect(screen.getByText(/file is too large/)).toBeInTheDocument();
    });
  });

  it('should handle streaming progress updates', async () => {
    // Mock streaming response
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('{"type":"progress","progress":{"stage":"validation","progress":25,"message":"Validating files"}}\n')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('{"type":"progress","progress":{"stage":"importing","progress":75,"message":"Importing data"}}\n')
        })
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('{"type":"complete","summary":{"success":true,"importedHabits":2,"importedEntries":10}}\n')
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    render(<EnhancedLoopHabitsImport />);
    
    // Add files
    const habitsInput = screen.getByLabelText(/Habits\.csv/) as HTMLInputElement;
    const checkmarksInput = screen.getByLabelText(/Checkmarks\.csv/) as HTMLInputElement;
    const scoresInput = screen.getByLabelText(/Scores\.csv/) as HTMLInputElement;
    
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(habitsInput, { target: { files: [file] } });
    fireEvent.change(checkmarksInput, { target: { files: [file] } });
    fireEvent.change(scoresInput, { target: { files: [file] } });
    
    // Start import
    const importButton = screen.getByText('Start Enhanced Import');
    fireEvent.click(importButton);
    
    // Should show progress
    await waitFor(() => {
      expect(screen.getByText('Validating Files')).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(screen.getByText('Importing Data')).toBeInTheDocument();
    });
    
    // Should show completion
    await waitFor(() => {
      expect(screen.getByText(/Import Completed Successfully/)).toBeInTheDocument();
    });
  });

  it('should handle conflict resolution', async () => {
    // Mock response with conflicts
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('{"type":"conflicts","conflicts":[{"habitName":"Exercise","existingHabit":{"id":"1","name":"Exercise","total_entries":5},"importedHabit":{"name":"Exercise","entries_count":10},"resolution":"merge"}]}\n')
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    render(<EnhancedLoopHabitsImport />);
    
    // Add files and start import
    const habitsInput = screen.getByLabelText(/Habits\.csv/) as HTMLInputElement;
    const checkmarksInput = screen.getByLabelText(/Checkmarks\.csv/) as HTMLInputElement;
    const scoresInput = screen.getByLabelText(/Scores\.csv/) as HTMLInputElement;
    
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(habitsInput, { target: { files: [file] } });
    fireEvent.change(checkmarksInput, { target: { files: [file] } });
    fireEvent.change(scoresInput, { target: { files: [file] } });
    
    const importButton = screen.getByText('Start Enhanced Import');
    fireEvent.click(importButton);
    
    // Should show conflict resolution UI
    await waitFor(() => {
      expect(screen.getByText(/Habit Name Conflicts Detected/)).toBeInTheDocument();
      expect(screen.getByText('Exercise')).toBeInTheDocument();
      expect(screen.getByText('🔄 Merge')).toBeInTheDocument();
      expect(screen.getByText('🔄 Replace')).toBeInTheDocument();
      expect(screen.getByText('⏭️ Skip')).toBeInTheDocument();
      expect(screen.getByText('✏️ Rename')).toBeInTheDocument();
    });
  });

  it('should handle conflict resolution selection', async () => {
    // Mock response with conflicts
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('{"type":"conflicts","conflicts":[{"habitName":"Exercise","existingHabit":{"id":"1","name":"Exercise","total_entries":5},"importedHabit":{"name":"Exercise","entries_count":10},"resolution":"merge"}]}\n')
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    render(<EnhancedLoopHabitsImport />);
    
    // Add files and start import
    const habitsInput = screen.getByLabelText(/Habits\.csv/) as HTMLInputElement;
    const checkmarksInput = screen.getByLabelText(/Checkmarks\.csv/) as HTMLInputElement;
    const scoresInput = screen.getByLabelText(/Scores\.csv/) as HTMLInputElement;
    
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(habitsInput, { target: { files: [file] } });
    fireEvent.change(checkmarksInput, { target: { files: [file] } });
    fireEvent.change(scoresInput, { target: { files: [file] } });
    
    const importButton = screen.getByText('Start Enhanced Import');
    fireEvent.click(importButton);
    
    await waitFor(() => {
      expect(screen.getByText('🔄 Replace')).toBeInTheDocument();
    });
    
    // Select replace option
    const replaceButton = screen.getByText('🔄 Replace');
    fireEvent.click(replaceButton);
    
    // Button should be highlighted
    expect(replaceButton).toHaveClass('bg-accent-warning/20');
  });

  it('should handle rename conflict resolution', async () => {
    // Mock window.prompt
    global.prompt = vi.fn().mockReturnValue('Exercise (Imported)');
    
    // Mock response with conflicts
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode('{"type":"conflicts","conflicts":[{"habitName":"Exercise","existingHabit":{"id":"1","name":"Exercise","total_entries":5},"importedHabit":{"name":"Exercise","entries_count":10},"resolution":"merge"}]}\n')
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    render(<EnhancedLoopHabitsImport />);
    
    // Add files and start import
    const habitsInput = screen.getByLabelText(/Habits\.csv/) as HTMLInputElement;
    const checkmarksInput = screen.getByLabelText(/Checkmarks\.csv/) as HTMLInputElement;
    const scoresInput = screen.getByLabelText(/Scores\.csv/) as HTMLInputElement;
    
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(habitsInput, { target: { files: [file] } });
    fireEvent.change(checkmarksInput, { target: { files: [file] } });
    fireEvent.change(scoresInput, { target: { files: [file] } });
    
    const importButton = screen.getByText('Start Enhanced Import');
    fireEvent.click(importButton);
    
    await waitFor(() => {
      expect(screen.getByText('✏️ Rename')).toBeInTheDocument();
    });
    
    // Click rename button
    const renameButton = screen.getByText('✏️ Rename');
    fireEvent.click(renameButton);
    
    expect(global.prompt).toHaveBeenCalledWith(
      'Enter new name for "Exercise":',
      'Exercise (Imported)'
    );
    
    // Should show new name
    await waitFor(() => {
      expect(screen.getByText('New name: Exercise (Imported)')).toBeInTheDocument();
    });
  });

  it('should show import summary on completion', async () => {
    const mockSummary = {
      success: true,
      totalHabits: 3,
      importedHabits: 3,
      skippedHabits: 0,
      totalEntries: 15,
      importedEntries: 15,
      failedEntries: 0,
      conflicts: [],
      errors: [],
      warnings: [],
      recommendations: ['Great job importing your habits!', 'Visit the Analytics dashboard'],
      processingTime: 2500,
      statistics: {
        habitsByCategory: { 'Fitness': 2, 'Health': 1 },
        entriesByMonth: { '2024-01': 15 },
        averageStreakLength: 7,
        mostActiveHabit: 'Exercise'
      }
    };

    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: new TextEncoder().encode(`{"type":"complete","summary":${JSON.stringify(mockSummary)}}\n`)
        })
        .mockResolvedValueOnce({
          done: true,
          value: undefined
        })
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    });

    render(<EnhancedLoopHabitsImport />);
    
    // Add files and start import
    const habitsInput = screen.getByLabelText(/Habits\.csv/) as HTMLInputElement;
    const checkmarksInput = screen.getByLabelText(/Checkmarks\.csv/) as HTMLInputElement;
    const scoresInput = screen.getByLabelText(/Scores\.csv/) as HTMLInputElement;
    
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(habitsInput, { target: { files: [file] } });
    fireEvent.change(checkmarksInput, { target: { files: [file] } });
    fireEvent.change(scoresInput, { target: { files: [file] } });
    
    const importButton = screen.getByText('Start Enhanced Import');
    fireEvent.click(importButton);
    
    // Should show summary
    await waitFor(() => {
      expect(screen.getByText(/Import Completed Successfully/)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Imported habits
      expect(screen.getByText('15')).toBeInTheDocument(); // Imported entries
      expect(screen.getByText('2.5s')).toBeInTheDocument(); // Processing time
      expect(screen.getByText('Great job importing your habits!')).toBeInTheDocument();
      expect(screen.getByText('View Imported Habits')).toBeInTheDocument();
      expect(screen.getByText('View Analytics')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    render(<EnhancedLoopHabitsImport />);
    
    // Add files and start import
    const habitsInput = screen.getByLabelText(/Habits\.csv/) as HTMLInputElement;
    const checkmarksInput = screen.getByLabelText(/Checkmarks\.csv/) as HTMLInputElement;
    const scoresInput = screen.getByLabelText(/Scores\.csv/) as HTMLInputElement;
    
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(habitsInput, { target: { files: [file] } });
    fireEvent.change(checkmarksInput, { target: { files: [file] } });
    fireEvent.change(scoresInput, { target: { files: [file] } });
    
    const importButton = screen.getByText('Start Enhanced Import');
    fireEvent.click(importButton);
    
    // Should show error
    await waitFor(() => {
      expect(screen.getByText(/Import Failed/)).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('should allow resetting the import process', async () => {
    render(<EnhancedLoopHabitsImport />);
    
    // Add files
    const habitsInput = screen.getByLabelText(/Habits\.csv/) as HTMLInputElement;
    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    fireEvent.change(habitsInput, { target: { files: [file] } });
    
    // Simulate error state
    (global.fetch as any).mockRejectedValue(new Error('Test error'));
    
    const checkmarksInput = screen.getByLabelText(/Checkmarks\.csv/) as HTMLInputElement;
    const scoresInput = screen.getByLabelText(/Scores\.csv/) as HTMLInputElement;
    fireEvent.change(checkmarksInput, { target: { files: [file] } });
    fireEvent.change(scoresInput, { target: { files: [file] } });
    
    const importButton = screen.getByText('Start Enhanced Import');
    fireEvent.click(importButton);
    
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
    
    // Click try again
    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);
    
    // Should return to initial state
    expect(screen.getByText('Start Enhanced Import')).toBeInTheDocument();
    expect(screen.queryByText(/Import Failed/)).not.toBeInTheDocument();
  });
});