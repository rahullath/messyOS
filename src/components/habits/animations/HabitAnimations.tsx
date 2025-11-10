// src/components/habits/animations/HabitAnimations.tsx
import React from 'react';

interface AnimationProps {
  children: React.ReactNode;
  className?: string;
}

// Smooth fade-in animation for habit cards
export const FadeInCard: React.FC<AnimationProps> = ({ children, className = '' }) => {
  return (
    <div className={`animate-fade-in-up ${className}`}>
      {children}
    </div>
  );
};

// Success animation for completed habits
export const SuccessAnimation: React.FC<{ isVisible: boolean; onComplete?: () => void }> = ({ 
  isVisible, 
  onComplete 
}) => {
  React.useEffect(() => {
    if (isVisible && onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="animate-success-bounce bg-green-500 text-white px-8 py-4 rounded-full shadow-lg">
        <div className="flex items-center space-x-3">
          <svg className="w-8 h-8 animate-check-draw" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="3" 
              d="M5 13l4 4L19 7"
              className="animate-check-path"
            />
          </svg>
          <span className="text-xl font-semibold">Great job! 🎉</span>
        </div>
      </div>
    </div>
  );
};

// Streak celebration animation
export const StreakCelebration: React.FC<{ 
  streak: number; 
  isVisible: boolean; 
  onComplete?: () => void 
}> = ({ streak, isVisible, onComplete }) => {
  React.useEffect(() => {
    if (isVisible && onComplete) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  const getStreakMessage = (streak: number) => {
    if (streak === 1) return "First step! 🌱";
    if (streak === 7) return "One week strong! 💪";
    if (streak === 30) return "One month champion! 🏆";
    if (streak === 100) return "Century club! 🔥";
    if (streak % 10 === 0) return `${streak} days blazing! 🔥`;
    return `${streak} day streak! 🔥`;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div className="animate-streak-celebration bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-6 rounded-xl shadow-2xl">
        <div className="text-center">
          <div className="text-6xl mb-2 animate-bounce">🔥</div>
          <div className="text-2xl font-bold mb-1">{getStreakMessage(streak)}</div>
          <div className="text-lg opacity-90">Keep the momentum going!</div>
        </div>
      </div>
    </div>
  );
};

// Loading skeleton for habit cards
export const HabitCardSkeleton: React.FC = () => {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
            <div className="h-4 bg-gray-300 rounded w-32"></div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gray-300 rounded"></div>
          <div className="h-5 bg-gray-300 rounded w-8"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="text-right">
          <div className="h-4 bg-gray-200 rounded w-12 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
        <div className="flex space-x-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="w-6 h-6 bg-gray-200 rounded-full"></div>
          ))}
        </div>
      </div>
      
      <div className="h-12 bg-gray-200 rounded-lg"></div>
    </div>
  );
};

// Smooth transition wrapper
export const SmoothTransition: React.FC<{
  children: React.ReactNode;
  isVisible: boolean;
  className?: string;
}> = ({ children, isVisible, className = '' }) => {
  return (
    <div className={`transition-all duration-300 ease-in-out ${
      isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
    } ${className}`}>
      {children}
    </div>
  );
};

// Hover animation wrapper
export const HoverScale: React.FC<AnimationProps> = ({ children, className = '' }) => {
  return (
    <div className={`transform transition-transform duration-200 hover:scale-105 ${className}`}>
      {children}
    </div>
  );
};

// Button press animation
export const PressAnimation: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}> = ({ children, onClick, className = '', disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`transform transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
};