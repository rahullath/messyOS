// src/components/ui/SuccessAnimations.tsx - Success animations and user feedback
import React, { useEffect, useState } from 'react';
import { analytics } from '../../lib/analytics/tracking';

interface SuccessAnimationProps {
  type?: 'checkmark' | 'confetti' | 'pulse' | 'slide' | 'bounce';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16'
};

export function SuccessAnimation({ 
  type = 'checkmark',
  size = 'md',
  message,
  duration = 2000,
  onComplete,
  className = ''
}: SuccessAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Track success animation display
    analytics.trackEngagement('success_animation', type, {
      message,
      duration
    });

    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete, type, message]);

  const renderCheckmark = () => (
    <div className={`relative ${sizeClasses[size]}`}>
      <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75"></div>
      <div className="relative bg-green-500 rounded-full flex items-center justify-center w-full h-full">
        <svg 
          className="w-1/2 h-1/2 text-white animate-bounce" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={3} 
            d="M5 13l4 4L19 7"
            className="animate-[draw_0.5s_ease-in-out_forwards]"
            style={{
              strokeDasharray: '20',
              strokeDashoffset: '20',
              animation: 'draw 0.5s ease-in-out 0.2s forwards'
            }}
          />
        </svg>
      </div>
    </div>
  );

  const renderConfetti = () => (
    <div className={`relative ${sizeClasses[size]} overflow-hidden`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-2xl animate-bounce">🎉</div>
      </div>
      {/* Confetti particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-2 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-full animate-ping"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${0.5 + Math.random() * 0.5}s`
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div className={`relative ${sizeClasses[size]}`}>
      <div className="absolute inset-0 bg-cyan-400 rounded-full animate-pulse opacity-50"></div>
      <div className="relative bg-cyan-500 rounded-full flex items-center justify-center w-full h-full animate-pulse">
        <div className="w-1/2 h-1/2 bg-white rounded-full"></div>
      </div>
    </div>
  );

  const renderSlide = () => (
    <div className={`${sizeClasses[size]} transform transition-all duration-500 ease-out animate-[slideIn_0.5s_ease-out]`}>
      <div className="bg-gradient-to-r from-green-400 to-blue-500 rounded-full w-full h-full flex items-center justify-center">
        <span className="text-white font-bold text-xl">✓</span>
      </div>
    </div>
  );

  const renderBounce = () => (
    <div className={`${sizeClasses[size]} animate-[bounceIn_0.6s_ease-out]`}>
      <div className="bg-gradient-to-r from-purple-400 to-pink-500 rounded-full w-full h-full flex items-center justify-center shadow-lg">
        <span className="text-white font-bold text-xl">✨</span>
      </div>
    </div>
  );

  const renderAnimation = () => {
    switch (type) {
      case 'confetti': return renderConfetti();
      case 'pulse': return renderPulse();
      case 'slide': return renderSlide();
      case 'bounce': return renderBounce();
      default: return renderCheckmark();
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderAnimation()}
      {message && (
        <p className="text-sm text-green-400 font-medium animate-fade-in text-center">
          {message}
        </p>
      )}
    </div>
  );
}

// Toast notification component
interface ToastProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose?: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

export function Toast({ 
  type = 'success',
  message,
  duration = 4000,
  onClose,
  position = 'top-right'
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2'
  };

  const typeStyles = {
    success: 'bg-green-500/10 border-green-500/20 text-green-400',
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400'
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed z-50 ${positionClasses[position]} transition-all duration-300 ${
        isExiting ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'
      }`}
    >
      <div className={`${typeStyles[type]} border rounded-lg p-4 backdrop-blur-sm shadow-lg max-w-sm`}>
        <div className="flex items-center space-x-3">
          <span className="text-lg">{icons[type]}</span>
          <p className="text-sm font-medium">{message}</p>
          <button
            onClick={() => {
              setIsExiting(true);
              setTimeout(() => {
                setIsVisible(false);
                onClose?.();
              }, 300);
            }}
            className="ml-auto text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// Progress indicator for multi-step processes
interface ProgressIndicatorProps {
  steps: string[];
  currentStep: number;
  completedSteps?: number[];
  className?: string;
}

export function ProgressIndicator({ 
  steps, 
  currentStep, 
  completedSteps = [],
  className = '' 
}: ProgressIndicatorProps) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index) || index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-green-500 text-white' 
                    : isCurrent 
                    ? 'bg-cyan-500 text-white animate-pulse' 
                    : 'bg-gray-600 text-gray-400'
                }`}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span className={`mt-2 text-xs text-center transition-colors duration-300 ${
                isCurrent ? 'text-cyan-400' : isCompleted ? 'text-green-400' : 'text-gray-500'
              }`}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div 
                className={`flex-1 h-0.5 mx-2 transition-colors duration-300 ${
                  index < currentStep ? 'bg-green-500' : 'bg-gray-600'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Floating action feedback
interface FloatingFeedbackProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  position: { x: number; y: number };
  onComplete?: () => void;
}

export function FloatingFeedback({ 
  message, 
  type = 'success', 
  position, 
  onComplete 
}: FloatingFeedbackProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const typeColors = {
    success: 'text-green-400',
    error: 'text-red-400',
    info: 'text-blue-400'
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed z-50 pointer-events-none animate-[floatUp_2s_ease-out_forwards]"
      style={{ left: position.x, top: position.y }}
    >
      <div className={`${typeColors[type]} text-sm font-medium bg-slate-800/90 backdrop-blur-sm px-3 py-1 rounded-lg border border-slate-600 shadow-lg`}>
        {message}
      </div>
    </div>
  );
}

// Enhanced micro-interaction feedback for buttons
export function useFeedback() {
  const [feedbacks, setFeedbacks] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    position: { x: number; y: number };
  }>>([]);

  const showFeedback = (
    message: string, 
    event: React.MouseEvent, 
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const id = Math.random().toString(36).substr(2, 9);
    
    // Add haptic feedback on supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(type === 'success' ? [10] : type === 'error' ? [50, 50, 50] : [20]);
    }
    
    // Track feedback interaction
    analytics.trackEngagement('micro_feedback', type, {
      message,
      elementType: (event.target as HTMLElement).tagName.toLowerCase()
    });
    
    setFeedbacks(prev => [...prev, {
      id,
      message,
      type,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top
      }
    }]);
  };

  const removeFeedback = (id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  };

  const FeedbackRenderer = () => (
    <>
      {feedbacks.map(feedback => (
        <FloatingFeedback
          key={feedback.id}
          message={feedback.message}
          type={feedback.type}
          position={feedback.position}
          onComplete={() => removeFeedback(feedback.id)}
        />
      ))}
    </>
  );

  return { showFeedback, FeedbackRenderer };
}

// Enhanced button with built-in feedback
interface FeedbackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  feedbackMessage?: string;
  feedbackType?: 'success' | 'error' | 'info';
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function FeedbackButton({
  children,
  feedbackMessage,
  feedbackType = 'success',
  variant = 'primary',
  size = 'md',
  onClick,
  className = '',
  disabled,
  ...props
}: FeedbackButtonProps) {
  const { showFeedback } = useFeedback();
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 150);
    
    if (feedbackMessage) {
      showFeedback(feedbackMessage, event, feedbackType);
    }
    
    onClick?.(event);
  };

  const variantClasses = {
    primary: 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600',
    ghost: 'bg-transparent hover:bg-slate-800 text-gray-300 border-slate-600'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative border rounded-lg font-medium transition-all duration-200 ease-out
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${isPressed ? 'transform scale-95' : 'transform scale-100'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg active:scale-95'}
        focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-900
        ${className}
      `}
    >
      <span className={`transition-all duration-200 ${isPressed ? 'scale-95' : 'scale-100'}`}>
        {children}
      </span>
    </button>
  );
}

// Add custom CSS animations
const customAnimations = `
@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes bounceIn {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  50% {
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes floatUp {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-50px) scale(0.8);
    opacity: 0;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;

// Inject animations into document head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = customAnimations;
  document.head.appendChild(style);
}