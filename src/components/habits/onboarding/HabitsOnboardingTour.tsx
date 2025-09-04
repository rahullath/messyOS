// src/components/habits/onboarding/HabitsOnboardingTour.tsx
import React, { useState, useEffect } from 'react';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    type: 'click' | 'highlight';
    element?: string;
  };
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Habits! 🎉',
    content: 'Let\'s take a quick tour to help you get started with building better habits.',
    target: 'body',
    position: 'bottom'
  },
  {
    id: 'stats',
    title: 'Your Progress Dashboard',
    content: 'Here you can see your daily progress, current streaks, and overall habit statistics.',
    target: '.stats-grid',
    position: 'bottom'
  },
  {
    id: 'new-habit',
    title: 'Create Your First Habit',
    content: 'Click here to create a new habit. You can choose from templates or create a custom one.',
    target: '#add-habit-btn',
    position: 'left',
    action: {
      type: 'highlight',
      element: '#add-habit-btn'
    }
  },
  {
    id: 'habit-cards',
    title: 'Your Habit Cards',
    content: 'Each habit shows your current streak, weekly progress, and completion status. Click to log your progress!',
    target: '.habits-grid',
    position: 'top'
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions (Mobile)',
    content: 'On mobile, use the quick actions widget for rapid habit logging without opening the full interface.',
    target: '#mobile-quick-actions',
    position: 'top'
  },
  {
    id: 'analytics',
    title: 'Analytics & Insights',
    content: 'Visit the analytics page to see detailed patterns, correlations, and AI-powered insights about your habits.',
    target: '.analytics-link',
    position: 'bottom'
  },
  {
    id: 'import',
    title: 'Import Existing Data',
    content: 'Already tracking habits elsewhere? Import your data from Loop Habits or other apps.',
    target: '#import-btn',
    position: 'left'
  },
  {
    id: 'complete',
    title: 'You\'re All Set! 🚀',
    content: 'Start building better habits today. Remember, consistency beats perfection!',
    target: 'body',
    position: 'bottom'
  }
];

interface HabitsOnboardingTourProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const HabitsOnboardingTour: React.FC<HabitsOnboardingTourProps> = ({
  isVisible,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isVisible_, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsVisible(true);
      updateTooltipPosition();
    } else {
      setIsVisible(false);
    }
  }, [isVisible, currentStep]);

  const updateTooltipPosition = () => {
    const step = TOUR_STEPS[currentStep];
    const targetElement = document.querySelector(step.target);
    
    if (targetElement && step.target !== 'body') {
      const rect = targetElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      let top = 0;
      let left = 0;
      
      switch (step.position) {
        case 'top':
          top = rect.top + scrollTop - 10;
          left = rect.left + scrollLeft + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + scrollTop + 10;
          left = rect.left + scrollLeft + rect.width / 2;
          break;
        case 'left':
          top = rect.top + scrollTop + rect.height / 2;
          left = rect.left + scrollLeft - 10;
          break;
        case 'right':
          top = rect.top + scrollTop + rect.height / 2;
          left = rect.right + scrollLeft + 10;
          break;
      }
      
      setTooltipPosition({ top, left });
      
      // Scroll element into view
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
      
      // Highlight element
      if (step.action?.type === 'highlight') {
        targetElement.classList.add('tour-highlight');
        setTimeout(() => {
          targetElement.classList.remove('tour-highlight');
        }, 3000);
      }
    } else {
      // Center of screen for body target
      setTooltipPosition({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2
      });
    }
  };

  const nextStep = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeTour = () => {
    setIsVisible(false);
    // Store completion in localStorage
    localStorage.setItem('habits-onboarding-completed', 'true');
    onComplete();
  };

  const skipTour = () => {
    setIsVisible(false);
    localStorage.setItem('habits-onboarding-skipped', 'true');
    onSkip();
  };

  if (!isVisible_) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 tour-overlay">
        {/* Spotlight effect for targeted elements */}
        {step.target !== 'body' && (
          <div className="tour-spotlight" />
        )}
        
        {/* Tooltip */}
        <div
          className={`absolute z-60 tour-tooltip animate-modal-fade-in ${
            step.target === 'body' ? 'tour-tooltip-center' : ''
          }`}
          style={step.target !== 'body' ? {
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            transform: getTooltipTransform(step.position)
          } : {}}
        >
          <div className="bg-white rounded-lg shadow-2xl p-6 max-w-sm mx-4 relative">
            {/* Arrow */}
            {step.target !== 'body' && (
              <div className={`absolute w-3 h-3 bg-white transform rotate-45 ${getArrowPosition(step.position)}`} />
            )}
            
            {/* Content */}
            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 pr-4">
                  {step.title}
                </h3>
                <button
                  onClick={skipTour}
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                {step.content}
              </p>
              
              {/* Progress indicator */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex space-x-1">
                  {TOUR_STEPS.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentStep
                          ? 'bg-blue-500'
                          : index < currentStep
                          ? 'bg-blue-300'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">
                  {currentStep + 1} of {TOUR_STEPS.length}
                </span>
              </div>
              
              {/* Actions */}
              <div className="flex justify-between">
                <button
                  onClick={prevStep}
                  disabled={isFirstStep}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                <div className="flex space-x-2">
                  <button
                    onClick={skipTour}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Skip Tour
                  </button>
                  <button
                    onClick={nextStep}
                    className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    {isLastStep ? 'Get Started!' : 'Next'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Helper functions
const getTooltipTransform = (position: string): string => {
  switch (position) {
    case 'top':
      return 'translate(-50%, -100%)';
    case 'bottom':
      return 'translate(-50%, 0%)';
    case 'left':
      return 'translate(-100%, -50%)';
    case 'right':
      return 'translate(0%, -50%)';
    default:
      return 'translate(-50%, -50%)';
  }
};

const getArrowPosition = (position: string): string => {
  switch (position) {
    case 'top':
      return 'bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2';
    case 'bottom':
      return 'top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
    case 'left':
      return 'right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2';
    case 'right':
      return 'left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2';
    default:
      return 'hidden';
  }
};

// Hook to check if user should see onboarding
export const useHabitsOnboarding = () => {
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('habits-onboarding-completed');
    const hasSkippedOnboarding = localStorage.getItem('habits-onboarding-skipped');
    const hasHabits = document.querySelectorAll('[data-habit-id]').length > 0;
    
    // Show onboarding if:
    // 1. User hasn't completed or skipped it
    // 2. User has no habits yet (first time)
    if (!hasCompletedOnboarding && !hasSkippedOnboarding && !hasHabits) {
      setShouldShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    setShouldShowOnboarding(false);
  };

  const skipOnboarding = () => {
    setShouldShowOnboarding(false);
  };

  return {
    shouldShowOnboarding,
    completeOnboarding,
    skipOnboarding
  };
};