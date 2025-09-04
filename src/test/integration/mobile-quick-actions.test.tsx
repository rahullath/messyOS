// src/test/integration/mobile-quick-actions.test.tsx
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileQuickActions from '../../components/habits/MobileQuickActions';

// Mock the offline sync
vi.mock('../../lib/habits/offline-sync', () => ({
  useOfflineSync: () => ({
    addToQueue: vi.fn(),
    syncQueue: vi.fn(),
    getStatus: () => ({ total: 0, unsynced: 0, failed: 0, isOnline: true, syncInProgress: false }),
    clearQueue: vi.fn()
  })
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

describe('MobileQuickActions', () => {
  const mockHabits = [
    {
      id: 'habit-1',
      name: 'Exercise',
      type: 'build' as const,
      measurement_type: 'boolean' as const,
      color: '#10B981',
      currentStreak: 5,
      completedToday: false,
      allows_skips: false
    },
    {
      id: 'habit-2',
      name: 'Meditation',
      type: 'build' as const,
      measurement_type: 'duration' as const,
      color: '#8B5CF6',
      currentStreak: 3,
      completedToday: false,
      allows_skips: true
    },
    {
      id: 'habit-3',
      name: 'Reading',
      type: 'build' as const,
      measurement_type: 'boolean' as const,
      color: '#3B82F6',
      currentStreak: 7,
      completedToday: true,
      allows_skips: false
    }
  ];

  const mockProps = {
    habits: mockHabits,
    onQuickLog: vi.fn(),
    onBatchComplete: vi.fn(),
    onEnhancedLog: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: true });
  });

  afterEach(() => {
    // Clean up any DOM elements created by tests
    document.body.innerHTML = '';
  });

  it('renders quick actions widget with pending habits', () => {
    render(<MobileQuickActions {...mockProps} />);
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('2 pending • 1/3 done')).toBeInTheDocument();
    
    // Should show pending habits (not completed today)
    expect(screen.getByText('Exercise')).toBeInTheDocument();
    expect(screen.getByText('Meditation')).toBeInTheDocument();
    
    // Should not show completed habit
    expect(screen.queryByText('Reading')).not.toBeInTheDocument();
  });

  it('shows completion message when all habits are done', () => {
    const allCompletedHabits = mockHabits.map(h => ({ ...h, completedToday: true }));
    
    render(<MobileQuickActions {...mockProps} habits={allCompletedHabits} />);
    
    expect(screen.getByText('All Done!')).toBeInTheDocument();
    expect(screen.getByText('You\'ve completed all your habits for today')).toBeInTheDocument();
    expect(screen.getByText('3/3 habits completed')).toBeInTheDocument();
  });

  it('handles quick log for boolean habits', async () => {
    render(<MobileQuickActions {...mockProps} />);
    
    const quickLogButton = screen.getByRole('button', { name: '✓' });
    
    expect(quickLogButton).toBeInTheDocument();
    
    fireEvent.click(quickLogButton);
    
    await waitFor(() => {
      expect(mockProps.onQuickLog).toHaveBeenCalledWith('habit-1', 1);
    });
  });

  it('handles enhanced log for non-boolean habits', async () => {
    render(<MobileQuickActions {...mockProps} />);
    
    const logButton = screen.getByRole('button', { name: 'Log' });
    
    expect(logButton).toBeInTheDocument();
    
    fireEvent.click(logButton);
    
    await waitFor(() => {
      expect(mockProps.onEnhancedLog).toHaveBeenCalledWith('habit-2', 'Meditation');
    });
  });

  it('enables batch mode and handles batch completion', async () => {
    render(<MobileQuickActions {...mockProps} />);
    
    // Enable batch mode - find the button with the checkmark icon
    const buttons = screen.getAllByRole('button');
    const batchToggle = buttons.find(button => {
      const svg = button.querySelector('svg path[d*="M9 12l2 2 4-4"]');
      return !!svg;
    });
    
    expect(batchToggle).toBeInTheDocument();
    fireEvent.click(batchToggle!);
    
    // Should show batch controls
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
    expect(screen.getByText('Complete 0')).toBeInTheDocument();
    
    // Select habits
    const exerciseCard = screen.getByText('Exercise').closest('div');
    fireEvent.click(exerciseCard!);
    
    const meditationCard = screen.getByText('Meditation').closest('div');
    fireEvent.click(meditationCard!);
    
    // Should update selection count
    await waitFor(() => {
      expect(screen.getByText('2 selected')).toBeInTheDocument();
      expect(screen.getByText('Complete 2')).toBeInTheDocument();
    });
    
    // Complete batch
    const completeButton = screen.getByText('Complete 2');
    fireEvent.click(completeButton);
    
    await waitFor(() => {
      expect(mockProps.onBatchComplete).toHaveBeenCalledWith(['habit-1', 'habit-2']);
    });
  });

  it('shows offline indicator when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });
    
    render(<MobileQuickActions {...mockProps} />);
    
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('handles touch gestures for swipe actions', async () => {
    render(<MobileQuickActions {...mockProps} />);
    
    const exerciseCard = screen.getByText('Exercise').closest('[style*="transform"]');
    
    expect(exerciseCard).toBeInTheDocument();
    
    // Simulate swipe right (complete)
    fireEvent.touchStart(exerciseCard!, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    fireEvent.touchMove(exerciseCard!, {
      touches: [{ clientX: 200, clientY: 100 }]
    });
    
    fireEvent.touchEnd(exerciseCard!, {
      touches: []
    });
    
    await waitFor(() => {
      expect(mockProps.onQuickLog).toHaveBeenCalledWith('habit-1', 1);
    });
  });

  it('handles swipe left for skip or enhanced logging', async () => {
    render(<MobileQuickActions {...mockProps} />);
    
    // Test skip for habit that allows skips
    const meditationCard = screen.getByText('Meditation').closest('[style*="transform"]');
    
    expect(meditationCard).toBeInTheDocument();
    
    fireEvent.touchStart(meditationCard!, {
      touches: [{ clientX: 200, clientY: 100 }]
    });
    
    fireEvent.touchMove(meditationCard!, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    fireEvent.touchEnd(meditationCard!, {
      touches: []
    });
    
    await waitFor(() => {
      expect(mockProps.onQuickLog).toHaveBeenCalledWith('habit-2', 2); // Skip value
    });
    
    // Test enhanced logging for habit that doesn't allow skips
    const exerciseCard = screen.getByText('Exercise').closest('[style*="transform"]');
    
    expect(exerciseCard).toBeInTheDocument();
    
    fireEvent.touchStart(exerciseCard!, {
      touches: [{ clientX: 200, clientY: 100 }]
    });
    
    fireEvent.touchMove(exerciseCard!, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    fireEvent.touchEnd(exerciseCard!, {
      touches: []
    });
    
    await waitFor(() => {
      expect(mockProps.onEnhancedLog).toHaveBeenCalledWith('habit-1', 'Exercise');
    });
  });

  it('displays habit information correctly', () => {
    render(<MobileQuickActions {...mockProps} />);
    
    // Check habit details
    expect(screen.getByText('🔥 5 day streak')).toBeInTheDocument();
    expect(screen.getByText('🔥 3 day streak')).toBeInTheDocument();
    
    // Check habit types
    expect(screen.getAllByText('build')).toHaveLength(2);
    
    // Check flexible indicator
    expect(screen.getByText('⏭️ Flexible')).toBeInTheDocument();
  });

  it('shows swipe instructions', () => {
    render(<MobileQuickActions {...mockProps} />);
    
    expect(screen.getByText(/💡 Swipe right to complete, left to/)).toBeInTheDocument();
  });
});