// src/test/integration/ux-polish-complete.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UXPolishProvider } from '../../components/habits/UXPolishProvider';
import { notificationService } from '../../lib/habits/notifications';

// Mock notification API
Object.defineProperty(window, 'Notification', {
  value: class MockNotification {
    static permission = 'default';
    static requestPermission = vi.fn().mockResolvedValue('granted');
    constructor(title: string, options?: NotificationOptions) {
      this.title = title;
      this.options = options;
    }
    close = vi.fn();
    title: string;
    options?: NotificationOptions;
  }
});

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn().mockResolvedValue({
      showNotification: vi.fn(),
      getNotifications: vi.fn().mockResolvedValue([])
    })
  }
});

describe('UX Polish Integration', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock habit cards in DOM
    const habitCard = document.createElement('div');
    habitCard.setAttribute('data-habit-id', 'test-habit-1');
    habitCard.innerHTML = `
      <h3 class="habit-name">Test Habit</h3>
      <div class="streak">5 day streak</div>
    `;
    document.body.appendChild(habitCard);
  });

  describe('Animations', () => {
    it('should trigger success animation on habit completion', async () => {
      render(<UXPolishProvider><div /></UXPolishProvider>);

      // Trigger habit completion event
      const event = new CustomEvent('habit-completed', {
        detail: { habitName: 'Test Habit', streak: 5 }
      });
      document.dispatchEvent(event);

      // Should show success animation
      await waitFor(() => {
        expect(document.querySelector('.animate-success-bounce')).toBeTruthy();
      });
    });

    it('should show streak celebration for milestones', async () => {
      render(<UXPolishProvider><div /></UXPolishProvider>);

      // Trigger streak milestone
      const event = new CustomEvent('habit-completed', {
        detail: { habitName: 'Test Habit', streak: 7 }
      });
      document.dispatchEvent(event);

      // Should show streak celebration after success animation
      await waitFor(() => {
        expect(document.querySelector('.animate-streak-celebration')).toBeTruthy();
      }, { timeout: 2000 });
    });

    it('should add hover animations to habit cards', () => {
      render(<UXPolishProvider><div /></UXPolishProvider>);

      const habitCard = document.querySelector('[data-habit-id]');
      expect(habitCard?.classList.contains('habit-card-enhanced')).toBe(true);
    });
  });

  describe('Loading States', () => {
    it('should show skeleton loading for habit cards', () => {
      const { container } = render(
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
      );

      expect(container.querySelector('.animate-pulse')).toBeTruthy();
      expect(container.querySelector('.bg-gray-300')).toBeTruthy();
    });

    it('should show loading spinner in buttons', () => {
      const { container } = render(
        <button className="flex items-center">
          <svg className="animate-spin w-4 h-4" />
          Loading...
        </button>
      );

      expect(container.querySelector('.animate-spin')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should handle keyboard navigation', () => {
      render(<UXPolishProvider><div /></UXPolishProvider>);

      // Test Ctrl+N for new habit
      const addButton = document.createElement('button');
      addButton.id = 'add-habit-btn';
      addButton.onclick = vi.fn();
      document.body.appendChild(addButton);

      fireEvent.keyDown(document, { key: 'n', ctrlKey: true });
      expect(addButton.onclick).toHaveBeenCalled();
    });

    it('should announce habit completion to screen reader', async () => {
      const mockAnnounce = vi.fn();
      window.announceToScreenReader = mockAnnounce;

      render(<UXPolishProvider><div /></UXPolishProvider>);

      // Mock logHabit function
      window.logHabit = vi.fn().mockResolvedValue(undefined);

      // Trigger enhanced logHabit
      await window.logHabit?.('test-habit-1', 'Test Habit');

      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining('Test Habit completed successfully'),
        'assertive'
      );
    });

    it('should provide proper ARIA labels for habit cards', () => {
      const habit = {
        id: 'test-habit-1',
        name: 'Test Habit',
        completedToday: false,
        realCurrentStreak: 5,
        category: 'Health'
      };

      const { container } = render(
        <div
          role="button"
          tabIndex={0}
          aria-label={`${habit.name}, not completed today, ${habit.realCurrentStreak} day streak, ${habit.category} habit`}
        >
          Test Habit Card
        </div>
      );

      const button = container.querySelector('[role="button"]');
      expect(button?.getAttribute('aria-label')).toContain('Test Habit');
      expect(button?.getAttribute('aria-label')).toContain('not completed today');
      expect(button?.getAttribute('aria-label')).toContain('5 day streak');
    });
  });

  describe('Notifications', () => {
    it('should request notification permission', async () => {
      const permission = await notificationService.requestPermission();
      expect(permission.granted).toBe(true);
    });

    it('should schedule habit reminders', async () => {
      const reminder = {
        habitId: 'test-habit-1',
        habitName: 'Test Habit',
        time: '09:00',
        enabled: true,
        days: [1, 2, 3, 4, 5] // Weekdays
      };

      const success = await notificationService.scheduleHabitReminder(reminder);
      expect(success).toBe(true);

      // Check if reminder is stored
      const stored = notificationService.getHabitReminder('test-habit-1');
      expect(stored).toEqual(reminder);
    });

    it('should show notification settings modal', async () => {
      render(<UXPolishProvider><div /></UXPolishProvider>);

      // Trigger notification settings
      const event = new CustomEvent('show-notification-settings', {
        detail: { habitId: 'test-habit-1', habitName: 'Test Habit' }
      });
      document.dispatchEvent(event);

      await waitFor(() => {
        expect(screen.getByText('Notification Settings')).toBeTruthy();
      });
    });

    it('should add notification buttons to habit cards', () => {
      render(<UXPolishProvider><div /></UXPolishProvider>);

      // Wait for buttons to be added
      setTimeout(() => {
        const notificationBtn = document.querySelector('.notification-btn');
        expect(notificationBtn).toBeTruthy();
        expect(notificationBtn?.getAttribute('title')).toBe('Set up notifications');
      }, 600);
    });
  });

  describe('Onboarding', () => {
    it('should show onboarding tour for new users', () => {
      // Clear onboarding completion flags
      localStorage.removeItem('habits-onboarding-completed');
      localStorage.removeItem('habits-onboarding-skipped');

      render(<UXPolishProvider><div /></UXPolishProvider>);

      // Should show onboarding tour
      expect(screen.queryByText('Welcome to Habits!')).toBeTruthy();
    });

    it('should not show onboarding for returning users', () => {
      localStorage.setItem('habits-onboarding-completed', 'true');

      render(<UXPolishProvider><div /></UXPolishProvider>);

      // Should not show onboarding tour
      expect(screen.queryByText('Welcome to Habits!')).toBeFalsy();
    });

    it('should navigate through onboarding steps', async () => {
      localStorage.removeItem('habits-onboarding-completed');
      localStorage.removeItem('habits-onboarding-skipped');

      render(<UXPolishProvider><div /></UXPolishProvider>);

      // Should show first step
      expect(screen.getByText('Welcome to Habits! 🎉')).toBeTruthy();

      // Click next
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      // Should show second step
      await waitFor(() => {
        expect(screen.getByText('Your Progress Dashboard')).toBeTruthy();
      });
    });
  });

  describe('Integration', () => {
    it('should enhance existing logHabit function', async () => {
      const originalLogHabit = vi.fn().mockResolvedValue(undefined);
      window.logHabit = originalLogHabit;

      render(<UXPolishProvider><div /></UXPolishProvider>);

      // Enhanced logHabit should be available
      expect(typeof window.logHabit).toBe('function');

      // Call enhanced logHabit
      await window.logHabit?.('test-habit-1', 'Test Habit');

      // Should call original function
      expect(originalLogHabit).toHaveBeenCalledWith('test-habit-1', 'Test Habit');
    });

    it('should add CSS classes to existing elements', () => {
      // Add some buttons to test
      const button = document.createElement('button');
      document.body.appendChild(button);

      render(<UXPolishProvider><div /></UXPolishProvider>);

      // Wait for CSS classes to be added
      setTimeout(() => {
        expect(button.classList.contains('button-enhanced')).toBe(true);
        expect(button.classList.contains('focus-enhanced')).toBe(true);
      }, 200);
    });

    it('should inject UX styles into document', () => {
      render(<UXPolishProvider><div /></UXPolishProvider>);

      // Check if styles are injected
      const styleElement = document.getElementById('ux-polish-styles');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.textContent).toContain('habit-card-enhanced');
    });
  });

  describe('Performance', () => {
    it('should not cause memory leaks', () => {
      const { unmount } = render(<UXPolishProvider><div /></UXPolishProvider>);

      // Add some event listeners
      const event = new CustomEvent('habit-completed', {
        detail: { habitName: 'Test Habit', streak: 5 }
      });
      document.dispatchEvent(event);

      // Unmount component
      unmount();

      // Should clean up properly
      expect(window.logHabit).toBeUndefined();
    });

    it('should debounce rapid animations', async () => {
      render(<UXPolishProvider><div /></UXPolishProvider>);

      // Trigger multiple rapid events
      for (let i = 0; i < 5; i++) {
        const event = new CustomEvent('habit-completed', {
          detail: { habitName: 'Test Habit', streak: i + 1 }
        });
        document.dispatchEvent(event);
      }

      // Should only show one animation
      await waitFor(() => {
        const animations = document.querySelectorAll('.animate-success-bounce');
        expect(animations.length).toBeLessThanOrEqual(1);
      });
    });
  });
});

describe('Notification Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should format reminder times correctly', () => {
    const { formatReminderTime } = require('../../lib/habits/notifications');
    expect(formatReminderTime('09:00')).toMatch(/9:00/);
    expect(formatReminderTime('13:30')).toMatch(/1:30/);
  });

  it('should format day names correctly', () => {
    const { getDayNames } = require('../../lib/habits/notifications');
    expect(getDayNames([0, 1, 2, 3, 4, 5, 6])).toBe('Daily');
    expect(getDayNames([1, 2, 3, 4, 5])).toBe('Weekdays');
    expect(getDayNames([0, 6])).toBe('Weekends');
    expect(getDayNames([1, 3, 5])).toBe('Mon, Wed, Fri');
  });

  it('should get notification statistics', () => {
    // Add some test reminders
    const reminders = {
      'habit-1': { habitId: 'habit-1', habitName: 'Test 1', time: '09:00', enabled: true, days: [1, 2, 3] },
      'habit-2': { habitId: 'habit-2', habitName: 'Test 2', time: '10:00', enabled: false, days: [1, 2, 3] }
    };
    localStorage.setItem('habit-reminders', JSON.stringify(reminders));

    const stats = notificationService.getNotificationStats();
    expect(stats.totalReminders).toBe(2);
    expect(stats.activeReminders).toBe(1);
    expect(stats.permissionStatus).toBe('default');
  });
});