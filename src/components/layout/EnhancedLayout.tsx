// src/components/layout/EnhancedLayout.tsx - Enhanced layout with UX polish
import React, { useEffect, useState } from 'react';
import { PageTransition } from '../ui/LoadingStates';
import { Toast, useFeedback } from '../ui/SuccessAnimations';
import { PerformanceMonitor, usePerformanceMonitoring } from '../debug/PerformanceMonitor';
import { AnalyticsDashboard, useAnalyticsDashboard } from '../debug/AnalyticsDashboard';
import { UXOptimizer, useUXOptimization } from '../ux/UXOptimizer';
import { analytics } from '../../lib/analytics/tracking';

interface EnhancedLayoutProps {
  children: React.ReactNode;
  pageName?: string;
  showPerformanceMonitor?: boolean;
  className?: string;
}

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export function EnhancedLayout({ 
  children, 
  pageName = 'unknown',
  showPerformanceMonitor = false,
  className = '' 
}: EnhancedLayoutProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const { FeedbackRenderer } = useFeedback();
  
  // Enable monitoring and optimization
  usePerformanceMonitoring();
  useAnalyticsDashboard();
  const { shouldReduceAnimations, optimizationLevel } = useUXOptimization();

  // Track page view
  useEffect(() => {
    analytics.trackPageView(pageName);
    
    // Track page visibility changes for engagement metrics
    const handleVisibilityChange = () => {
      if (document.hidden) {
        analytics.track('page_hidden', {
          category: 'engagement',
          action: 'page_hidden',
          page: pageName
        });
      } else {
        analytics.track('page_visible', {
          category: 'engagement',
          action: 'page_visible',
          page: pageName
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pageName]);

  // Global loading state management
  useEffect(() => {
    const handleLoadingStart = () => setIsLoading(true);
    const handleLoadingEnd = () => setIsLoading(false);

    // Listen for navigation events
    window.addEventListener('beforeunload', handleLoadingStart);
    window.addEventListener('load', handleLoadingEnd);

    return () => {
      window.removeEventListener('beforeunload', handleLoadingStart);
      window.removeEventListener('load', handleLoadingEnd);
    };
  }, []);

  // Toast management
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { ...toast, id }]);
    
    // Track toast display
    analytics.trackEngagement('toast_shown', toast.type, {
      message: toast.message,
      page: pageName
    });
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Global error handling
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      analytics.trackJavaScriptError(event.error, event.filename);
      addToast({
        type: 'error',
        message: 'Something went wrong. Please try again.',
        duration: 5000
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      analytics.trackJavaScriptError(new Error(event.reason), 'unhandled_promise');
      addToast({
        type: 'error',
        message: 'An unexpected error occurred.',
        duration: 5000
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      addToast({
        type: 'success',
        message: 'Connection restored',
        duration: 3000
      });
      analytics.track('network_online', {
        category: 'network',
        action: 'connection_restored'
      });
    };

    const handleOffline = () => {
      addToast({
        type: 'warning',
        message: 'You are offline. Some features may not work.',
        duration: 5000
      });
      analytics.track('network_offline', {
        category: 'network',
        action: 'connection_lost'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Smooth scroll behavior
  useEffect(() => {
    // Enable smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';
    
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  // Focus management for accessibility
  useEffect(() => {
    const handleRouteChange = () => {
      // Focus management for screen readers
      const mainContent = document.querySelector('main');
      if (mainContent) {
        mainContent.focus();
      }
    };

    // Listen for route changes (this would be more sophisticated in a real router)
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  return (
    <div className={`min-h-screen bg-slate-900 text-white ${className}`}>
      {/* Skip to main content for accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-cyan-600 text-white px-4 py-2 rounded-lg z-50"
      >
        Skip to main content
      </a>

      {/* Main content with page transitions */}
      <PageTransition isLoading={isLoading} pageName={pageName}>
        <main 
          id="main-content" 
          tabIndex={-1}
          className="focus:outline-none"
        >
          {children}
        </main>
      </PageTransition>

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Floating feedback renderer */}
      <FeedbackRenderer />

      {/* Debug and optimization tools (development only) */}
      {showPerformanceMonitor && <PerformanceMonitor />}
      <AnalyticsDashboard />
      <UXOptimizer />

      {/* Loading overlay for global loading states */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-cyan-400 rounded-full"></div>
              <span className="text-gray-300">Loading...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for managing global UX state
export function useEnhancedUX() {
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<ToastMessage[]>([]);

  const showNotification = (notification: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { ...notification, id }]);
    
    // Auto-remove after duration
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, notification.duration || 4000);
  };

  const startLoading = (context?: string) => {
    setIsLoading(true);
    if (context) {
      analytics.track('loading_start', {
        category: 'ux',
        action: 'loading_start',
        context
      });
    }
  };

  const stopLoading = (context?: string) => {
    setIsLoading(false);
    if (context) {
      analytics.track('loading_end', {
        category: 'ux',
        action: 'loading_end',
        context
      });
    }
  };

  const trackUserAction = (action: string, element?: string, metadata?: Record<string, any>) => {
    analytics.trackEngagement(action, element, metadata);
  };

  return {
    isLoading,
    notifications,
    showNotification,
    startLoading,
    stopLoading,
    trackUserAction
  };
}

// Higher-order component for automatic UX enhancements
export function withEnhancedUX<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    pageName?: string;
    trackPerformance?: boolean;
    showPerformanceMonitor?: boolean;
  } = {}
) {
  return function EnhancedComponent(props: P) {
    return (
      <EnhancedLayout 
        pageName={options.pageName}
        showPerformanceMonitor={options.showPerformanceMonitor}
      >
        <Component {...props} />
      </EnhancedLayout>
    );
  };
}

// CSS for enhanced animations and transitions
const enhancedStyles = `
  /* Smooth transitions for all interactive elements */
  .enhanced-transition {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  /* Focus styles for accessibility */
  .enhanced-focus:focus {
    outline: 2px solid #06b6d4;
    outline-offset: 2px;
  }

  /* Hover effects */
  .enhanced-hover:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  /* Loading shimmer effect */
  .shimmer {
    background: linear-gradient(90deg, #1e293b 25%, #334155 50%, #1e293b 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  /* Smooth scroll behavior */
  html {
    scroll-behavior: smooth;
  }

  /* Reduced motion for accessibility */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
    
    html {
      scroll-behavior: auto;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .enhanced-layout {
      --tw-border-opacity: 1;
      border-color: rgb(255 255 255 / var(--tw-border-opacity));
    }
  }

  /* Dark mode optimizations */
  @media (prefers-color-scheme: dark) {
    .enhanced-layout {
      color-scheme: dark;
    }
  }
`;

// Inject enhanced styles
if (typeof document !== 'undefined') {
  const styleId = 'enhanced-ux-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = enhancedStyles;
    document.head.appendChild(style);
  }
}