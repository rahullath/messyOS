// src/components/habits/UXPolishProvider.tsx
import React, { useEffect, useState } from 'react';
import { AccessibilityProvider } from './accessibility/AccessibilityEnhancements';
import { HabitsOnboardingTour, useHabitsOnboarding } from './onboarding/HabitsOnboardingTour';
import { SuccessAnimation, StreakCelebration } from './animations/HabitAnimations';
import { NotificationSettings, NotificationIndicator } from './notifications/NotificationSettings';

interface UXPolishProviderProps {
  children: React.ReactNode;
}

interface CelebrationState {
  type: 'success' | 'streak' | null;
  visible: boolean;
  data?: {
    habitName?: string;
    streak?: number;
  };
}

export const UXPolishProvider: React.FC<UXPolishProviderProps> = ({ children }) => {
  const [celebration, setCelebration] = useState<CelebrationState>({
    type: null,
    visible: false
  });
  
  const [notificationSettings, setNotificationSettings] = useState<{
    habitId: string;
    habitName: string;
    visible: boolean;
  } | null>(null);

  const {
    shouldShowOnboarding,
    completeOnboarding,
    skipOnboarding
  } = useHabitsOnboarding();

  useEffect(() => {
    // Global success animation handler
    const handleHabitSuccess = (event: CustomEvent) => {
      const { habitName, streak } = event.detail;
      
      // Show success animation
      setCelebration({
        type: 'success',
        visible: true,
        data: { habitName }
      });

      // Show streak celebration for milestones
      if (streak && (streak === 1 || streak === 7 || streak === 30 || streak % 10 === 0)) {
        setTimeout(() => {
          setCelebration({
            type: 'streak',
            visible: true,
            data: { habitName, streak }
          });
        }, 1000);
      }
    };

    // Global notification settings handler
    const handleNotificationSettings = (event: CustomEvent) => {
      const { habitId, habitName } = event.detail;
      setNotificationSettings({
        habitId,
        habitName,
        visible: true
      });
    };

    // Listen for custom events
    document.addEventListener('habit-completed', handleHabitSuccess as EventListener);
    document.addEventListener('show-notification-settings', handleNotificationSettings as EventListener);

    // Enhanced habit completion with animations
    const originalLogHabit = window.logHabit;
    window.logHabit = async (habitId: string, habitName: string) => {
      try {
        // Call original function
        if (originalLogHabit) {
          await originalLogHabit(habitId, habitName);
        }

        // Get habit data for streak info
        const habitCard = document.querySelector(`[data-habit-id="${habitId}"]`);
        const streakElement = habitCard?.querySelector('.streak, [class*="streak"]');
        const streakText = streakElement?.textContent || '0';
        const streak = parseInt(streakText.match(/\d+/)?.[0] || '0');

        // Trigger success animation
        document.dispatchEvent(new CustomEvent('habit-completed', {
          detail: { habitName, streak }
        }));

        // Announce to screen reader
        window.announceToScreenReader?.(
          `${habitName} completed successfully! Current streak: ${streak} days`,
          'assertive'
        );

      } catch (error) {
        console.error('Error in enhanced logHabit:', error);
        // Still show original error handling
        throw error;
      }
    };

    // Add notification settings to habit cards
    const addNotificationButtons = () => {
      const habitCards = document.querySelectorAll('[data-habit-id]');
      habitCards.forEach(card => {
        const habitId = card.getAttribute('data-habit-id');
        const habitName = card.querySelector('h3, h4, .habit-name')?.textContent || 'Habit';
        
        // Check if button already exists
        if (card.querySelector('.notification-btn')) return;

        // Add notification button
        const button = document.createElement('button');
        button.className = 'notification-btn absolute top-2 right-2 p-1 text-gray-400 hover:text-blue-500 transition-colors';
        button.innerHTML = `
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
          </svg>
        `;
        button.title = 'Set up notifications';
        button.onclick = (e) => {
          e.stopPropagation();
          document.dispatchEvent(new CustomEvent('show-notification-settings', {
            detail: { habitId, habitName }
          }));
        };

        // Make card relative positioned
        (card as HTMLElement).style.position = 'relative';
        card.appendChild(button);
      });
    };

    // Add notification buttons after a short delay to ensure DOM is ready
    setTimeout(addNotificationButtons, 500);

    // Cleanup
    return () => {
      document.removeEventListener('habit-completed', handleHabitSuccess as EventListener);
      document.removeEventListener('show-notification-settings', handleNotificationSettings as EventListener);
      
      // Restore original logHabit
      if (originalLogHabit) {
        window.logHabit = originalLogHabit;
      }
    };
  }, []);

  // Handle celebration completion
  const handleCelebrationComplete = () => {
    setCelebration(prev => ({ ...prev, visible: false }));
    
    // Clear after animation
    setTimeout(() => {
      setCelebration({ type: null, visible: false });
    }, 500);
  };

  return (
    <AccessibilityProvider>
      {children}
      
      {/* Success Animation */}
      <SuccessAnimation
        isVisible={celebration.type === 'success' && celebration.visible}
        onComplete={handleCelebrationComplete}
      />
      
      {/* Streak Celebration */}
      <StreakCelebration
        streak={celebration.data?.streak || 0}
        isVisible={celebration.type === 'streak' && celebration.visible}
        onComplete={handleCelebrationComplete}
      />
      
      {/* Onboarding Tour */}
      <HabitsOnboardingTour
        isVisible={shouldShowOnboarding}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />
      
      {/* Notification Settings Modal */}
      {notificationSettings && (
        <NotificationSettings
          habitId={notificationSettings.habitId}
          habitName={notificationSettings.habitName}
          onClose={() => setNotificationSettings(null)}
        />
      )}
    </AccessibilityProvider>
  );
};

// Enhanced habit card wrapper with all UX improvements
export const EnhancedHabitCard: React.FC<{
  habit: any;
  children: React.ReactNode;
}> = ({ habit, children }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative transition-all duration-200 ${
        isHovered ? 'transform scale-105 shadow-lg' : ''
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      {/* Notification Indicator */}
      <div className="absolute top-2 right-2">
        <NotificationIndicator habitId={habit.id} />
      </div>
      
      {/* Completion Ripple Effect */}
      {habit.completedToday && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="completion-ripple w-full h-full rounded-lg" />
        </div>
      )}
    </div>
  );
};

// Hook for triggering UX enhancements
export const useHabitUX = () => {
  const triggerSuccess = (habitName: string, streak: number = 0) => {
    document.dispatchEvent(new CustomEvent('habit-completed', {
      detail: { habitName, streak }
    }));
  };

  const showNotificationSettings = (habitId: string, habitName: string) => {
    document.dispatchEvent(new CustomEvent('show-notification-settings', {
      detail: { habitId, habitName }
    }));
  };

  const announceToUser = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    window.announceToScreenReader?.(message, priority);
  };

  return {
    triggerSuccess,
    showNotificationSettings,
    announceToUser
  };
};

// Global CSS injection for UX enhancements
export const injectUXStyles = () => {
  if (typeof document === 'undefined') return;

  const styleId = 'ux-polish-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Import all UX enhancement styles */
    @import url('/src/styles/animations.css');
    @import url('/src/styles/accessibility.css');
    @import url('/src/styles/onboarding.css');
    
    /* Additional UX polish styles */
    .habit-card-enhanced {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .habit-card-enhanced:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
    
    .habit-card-enhanced:active {
      transform: translateY(0);
    }
    
    /* Smooth loading states */
    .loading-shimmer {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200px 100%;
      animation: shimmer 1.5s infinite;
    }
    
    /* Focus improvements */
    .focus-enhanced:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
      border-radius: 8px;
    }
    
    /* Button press feedback */
    .button-enhanced {
      transition: all 0.1s ease;
    }
    
    .button-enhanced:active {
      transform: scale(0.98);
    }
    
    /* Notification button styles */
    .notification-btn {
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    
    .habit-card-enhanced:hover .notification-btn {
      opacity: 1;
    }
    
    /* Success feedback */
    .success-feedback {
      background: linear-gradient(45deg, #10B981, #059669);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      animation: success-slide-in 0.3s ease-out;
    }
    
    @keyframes success-slide-in {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    /* Mobile touch improvements */
    @media (max-width: 768px) {
      .habit-card-enhanced {
        min-height: 44px; /* Minimum touch target */
      }
      
      .notification-btn {
        opacity: 1; /* Always visible on mobile */
        min-width: 44px;
        min-height: 44px;
      }
    }
    
    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
      .habit-card-enhanced,
      .button-enhanced,
      .notification-btn {
        transition: none !important;
        animation: none !important;
      }
      
      .habit-card-enhanced:hover {
        transform: none !important;
      }
    }
  `;
  
  document.head.appendChild(style);
};

// Initialize UX enhancements
if (typeof window !== 'undefined') {
  // Inject styles when component loads
  injectUXStyles();
  
  // Add CSS classes to existing elements
  setTimeout(() => {
    const habitCards = document.querySelectorAll('[data-habit-id]');
    habitCards.forEach(card => {
      card.classList.add('habit-card-enhanced');
    });
    
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
      button.classList.add('button-enhanced', 'focus-enhanced');
    });
  }, 100);
}