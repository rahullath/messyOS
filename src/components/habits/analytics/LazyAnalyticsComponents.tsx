// src/components/habits/analytics/LazyAnalyticsComponents.tsx - Lazy loading wrapper for analytics components
import React, { Suspense, lazy, useState, useEffect } from 'react';

// Lazy load analytics components
const CompletionRateChart = lazy(() => 
  import('./CompletionRateChart').then(module => ({ default: module.CompletionRateChart }))
);

const HeatmapCalendar = lazy(() => 
  import('./HeatmapCalendar').then(module => ({ default: module.HeatmapCalendar }))
);

const ContextSuccessRates = lazy(() => 
  import('./ContextSuccessRates').then(module => ({ default: module.ContextSuccessRates }))
);

const StreakTimeline = lazy(() => 
  import('./StreakTimeline').then(module => ({ default: module.StreakTimeline }))
);

const CrossHabitCorrelations = lazy(() => 
  import('./CrossHabitCorrelations')
);

const PatternInsights = lazy(() => 
  import('./PatternInsights').then(module => ({ default: module.PatternInsights }))
);

// Loading skeleton components
const ChartSkeleton = () => (
  <div className="card animate-pulse">
    <div className="h-6 bg-surface rounded mb-4 w-1/3"></div>
    <div className="h-64 bg-surface rounded"></div>
  </div>
);

const HeatmapSkeleton = () => (
  <div className="card animate-pulse">
    <div className="h-6 bg-surface rounded mb-4 w-1/4"></div>
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="h-8 bg-surface rounded"></div>
      ))}
    </div>
  </div>
);

const TimelineSkeleton = () => (
  <div className="card animate-pulse">
    <div className="h-6 bg-surface rounded mb-4 w-1/3"></div>
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          <div className="h-4 w-4 bg-surface rounded-full"></div>
          <div className="h-4 bg-surface rounded flex-1"></div>
          <div className="h-4 bg-surface rounded w-16"></div>
        </div>
      ))}
    </div>
  </div>
);

const InsightsSkeleton = () => (
  <div className="card animate-pulse">
    <div className="h-6 bg-surface rounded mb-4 w-1/4"></div>
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-surface rounded w-3/4"></div>
          <div className="h-3 bg-surface rounded w-1/2"></div>
        </div>
      ))}
    </div>
  </div>
);

// Error boundary for analytics components
class AnalyticsErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Analytics component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="card border-accent-error/20 bg-accent-error/5">
          <div className="flex items-center space-x-3 text-accent-error">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <div>
              <h3 className="font-medium">Analytics Error</h3>
              <p className="text-sm text-text-secondary mt-1">
                Failed to load this analytics component. Please try refreshing the page.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Intersection Observer hook for lazy loading
const useIntersectionObserver = (
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, options]);

  return isIntersecting;
};

// Lazy wrapper component
interface LazyComponentProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  className?: string;
}

const LazyWrapper: React.FC<LazyComponentProps> = ({ 
  children, 
  fallback, 
  className = '' 
}) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(ref);

  return (
    <div ref={ref} className={className}>
      {isVisible ? (
        <AnalyticsErrorBoundary>
          <Suspense fallback={fallback}>
            {children}
          </Suspense>
        </AnalyticsErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  );
};

// Lazy analytics components with proper loading states
export const LazyCompletionRateChart: React.FC<{ data: any }> = ({ data }) => (
  <LazyWrapper fallback={<ChartSkeleton />}>
    <CompletionRateChart data={data} />
  </LazyWrapper>
);

export const LazyHeatmapCalendar: React.FC<{ data: any }> = ({ data }) => (
  <LazyWrapper fallback={<HeatmapSkeleton />}>
    <HeatmapCalendar data={data} />
  </LazyWrapper>
);

export const LazyContextSuccessRates: React.FC<{ data: any }> = ({ data }) => (
  <LazyWrapper fallback={<ChartSkeleton />}>
    <ContextSuccessRates data={data} />
  </LazyWrapper>
);

export const LazyStreakTimeline: React.FC<{ data: any }> = ({ data }) => (
  <LazyWrapper fallback={<TimelineSkeleton />}>
    <StreakTimeline data={data} />
  </LazyWrapper>
);

export const LazyCrossHabitCorrelations: React.FC<{ data: any }> = ({ data }) => (
  <LazyWrapper fallback={<ChartSkeleton />}>
    <CrossHabitCorrelations data={data} />
  </LazyWrapper>
);

export const LazyPatternInsights: React.FC<{ data: any; showDetailed?: boolean }> = ({ 
  data, 
  showDetailed 
}) => (
  <LazyWrapper fallback={<InsightsSkeleton />}>
    <PatternInsights data={data} showDetailed={showDetailed} />
  </LazyWrapper>
);

// Performance monitoring hook
export const useAnalyticsPerformance = () => {
  const [metrics, setMetrics] = useState<{
    loadTime: number;
    renderTime: number;
    componentCount: number;
  }>({
    loadTime: 0,
    renderTime: 0,
    componentCount: 0
  });

  const startTiming = () => {
    return performance.now();
  };

  const endTiming = (startTime: number, type: 'load' | 'render') => {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    setMetrics(prev => ({
      ...prev,
      [type === 'load' ? 'loadTime' : 'renderTime']: duration,
      componentCount: prev.componentCount + 1
    }));

    // Log performance metrics for monitoring
    if (duration > 1000) { // Log slow components
      console.warn(`Slow analytics component ${type}:`, {
        duration: `${duration.toFixed(2)}ms`,
        type
      });
    }
  };

  return { metrics, startTiming, endTiming };
};

// Preload analytics components
export const preloadAnalyticsComponents = () => {
  // Preload components when user is likely to need them
  const preloadPromises = [
    import('./CompletionRateChart'),
    import('./HeatmapCalendar'),
    import('./ContextSuccessRates'),
    import('./StreakTimeline'),
    import('./CrossHabitCorrelations'),
    import('./PatternInsights')
  ];

  return Promise.all(preloadPromises).catch(error => {
    console.warn('Failed to preload analytics components:', error);
  });
};

// Analytics data prefetcher
export const useAnalyticsDataPrefetch = (userId: string) => {
  const [isPrefetching, setIsPrefetching] = useState(false);

  const prefetchData = async () => {
    if (isPrefetching) return;
    
    setIsPrefetching(true);
    
    try {
      // Prefetch common analytics data
      const prefetchPromises = [
        fetch(`/api/habits/analytics/export?format=json&dateRange=30`),
        fetch(`/api/habits?user_id=${userId}`),
        fetch(`/api/cross-module/correlations?user_id=${userId}`)
      ];

      await Promise.all(prefetchPromises);
    } catch (error) {
      console.warn('Failed to prefetch analytics data:', error);
    } finally {
      setIsPrefetching(false);
    }
  };

  return { prefetchData, isPrefetching };
};

export default {
  LazyCompletionRateChart,
  LazyHeatmapCalendar,
  LazyContextSuccessRates,
  LazyStreakTimeline,
  LazyCrossHabitCorrelations,
  LazyPatternInsights,
  preloadAnalyticsComponents,
  useAnalyticsPerformance,
  useAnalyticsDataPrefetch
};