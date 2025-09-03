// src/components/ui/LoadingStates.tsx - Enhanced loading states and transitions
import React from 'react';
import { analytics } from '../../lib/analytics/tracking';

interface LoadingStateProps {
  type?: 'spinner' | 'skeleton' | 'pulse' | 'dots' | 'progress';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  progress?: number;
  className?: string;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4', 
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

export function LoadingState({ 
  type = 'spinner', 
  size = 'md', 
  message, 
  progress,
  className = '' 
}: LoadingStateProps) {
  const renderSpinner = () => (
    <div className={`animate-spin rounded-full border-2 border-gray-600 border-t-cyan-400 ${sizeClasses[size]}`} />
  );

  const renderSkeleton = () => (
    <div className="animate-pulse space-y-3">
      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      <div className="h-4 bg-gray-700 rounded w-5/6"></div>
    </div>
  );

  const renderPulse = () => (
    <div className={`bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 bg-[length:200%_100%] animate-pulse rounded ${sizeClasses[size]}`} />
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
  );

  const renderProgress = () => (
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div 
        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress || 0}%` }}
      />
    </div>
  );

  const renderLoader = () => {
    switch (type) {
      case 'skeleton': return renderSkeleton();
      case 'pulse': return renderPulse();
      case 'dots': return renderDots();
      case 'progress': return renderProgress();
      default: return renderSpinner();
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderLoader()}
      {message && (
        <span className="text-sm text-gray-400 animate-pulse">{message}</span>
      )}
      {type === 'progress' && progress !== undefined && (
        <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
      )}
    </div>
  );
}

// Page transition wrapper with analytics
interface PageTransitionProps {
  children: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  pageName?: string;
  transitionType?: 'fade' | 'slide' | 'scale' | 'blur';
}

export function PageTransition({ 
  children, 
  isLoading = false, 
  className = '', 
  pageName,
  transitionType = 'fade'
}: PageTransitionProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const [transitionStage, setTransitionStage] = React.useState<'idle' | 'exiting' | 'entering'>('idle');

  React.useEffect(() => {
    if (isLoading && pageName) {
      analytics.track('page_transition_start', {
        category: 'navigation',
        action: 'transition_start',
        page: pageName,
        transitionType
      });
      setTransitionStage('exiting');
    } else if (!isLoading && pageName && transitionStage === 'exiting') {
      analytics.track('page_transition_complete', {
        category: 'navigation',
        action: 'transition_complete',
        page: pageName,
        transitionType
      });
      setTransitionStage('entering');
      setTimeout(() => setTransitionStage('idle'), 300);
    }
  }, [isLoading, pageName, transitionType, transitionStage]);

  const getTransitionClasses = () => {
    const baseClasses = 'transition-all duration-300 ease-in-out';
    
    switch (transitionType) {
      case 'slide':
        return `${baseClasses} ${
          transitionStage === 'exiting' 
            ? 'transform translate-x-full opacity-0' 
            : transitionStage === 'entering'
            ? 'transform -translate-x-full opacity-0'
            : 'transform translate-x-0 opacity-100'
        }`;
      case 'scale':
        return `${baseClasses} ${
          transitionStage === 'exiting' || transitionStage === 'entering'
            ? 'transform scale-95 opacity-0' 
            : 'transform scale-100 opacity-100'
        }`;
      case 'blur':
        return `${baseClasses} ${
          transitionStage === 'exiting' || transitionStage === 'entering'
            ? 'blur-sm opacity-0' 
            : 'blur-0 opacity-100'
        }`;
      default: // fade
        return `${baseClasses} ${
          isLoading || transitionStage === 'exiting' || transitionStage === 'entering'
            ? 'opacity-0' 
            : 'opacity-100'
        }`;
    }
  };

  return (
    <div className={`${getTransitionClasses()} ${className}`}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-50 animate-in fade-in duration-200">
          <div className="bg-slate-800/90 border border-slate-600 rounded-xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
            <LoadingState type="spinner" size="lg" message="Loading..." />
          </div>
        </div>
      )}
    </div>
  );
}

// Form loading overlay
interface FormLoadingProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
}

export function FormLoading({ isLoading, message = "Processing...", children }: FormLoadingProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 backdrop-blur-sm rounded-lg z-10">
          <LoadingState type="dots" message={message} />
        </div>
      )}
    </div>
  );
}

// Button loading state
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export function LoadingButton({ 
  isLoading = false, 
  loadingText = "Loading...", 
  children, 
  disabled,
  className = '',
  ...props 
}: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`relative transition-all duration-200 ${isLoading ? 'cursor-not-allowed' : ''} ${className}`}
    >
      <span className={`transition-opacity duration-200 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </span>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingState type="spinner" size="sm" />
          {loadingText && (
            <span className="ml-2 text-sm">{loadingText}</span>
          )}
        </div>
      )}
    </button>
  );
}

// Card loading skeleton
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 animate-pulse">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      ))}
    </>
  );
}

// List loading skeleton
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 animate-pulse">
          <div className="w-8 h-8 bg-gray-700 rounded"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2"></div>
          </div>
          <div className="w-16 h-6 bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
  );
}