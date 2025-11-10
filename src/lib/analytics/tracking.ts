// src/lib/analytics/tracking.ts - Analytics tracking for user flow optimization
interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  properties?: Record<string, any>;
}

interface UserFlowEvent {
  step: string;
  flow: string;
  duration?: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

interface PerformanceEvent {
  metric: string;
  value: number;
  page: string;
  userAgent: string;
  connection?: string;
}

class AnalyticsTracker {
  private events: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private isEnabled: boolean = true;
  private batchSize: number = 10;
  private flushInterval: number = 30000; // 30 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeTracking();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public isPublicRoute(pathname: string): boolean {
    const publicRoutes = [
      '/',
      '/landing',
      '/login',
      '/auth/callback',
      '/auth/exchange',
      '/onboarding',
      '/reset-password',
      '/auth-status'
    ];
    
    const staticAssetPatterns = [
      /^\/icons\/.*/,
      /^\/manifest\.json$/,
      /^\/favicon\..*/,
      /^\/sw\.js$/,
      /^\/.*\.(png|jpg|jpeg|svg|ico|webp)$/,
      /^\/robots\.txt$/,
      /^\/sitemap\.xml$/
    ];

    // Check exact matches first
    if (publicRoutes.includes(pathname)) {
      return true;
    }

    // Check pattern matches
    return staticAssetPatterns.some(pattern => pattern.test(pathname));
  }

  private initializeTracking(): void {
    if (typeof window === 'undefined') return;

    // Start flush timer
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush(true);
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush();
      }
    });
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  // Core tracking method
  track(event: string, properties: Record<string, any> = {}): void {
    if (!this.isEnabled) return;

    // Skip tracking if we're in a browser environment but window is not available
    if (typeof window === 'undefined') return;

    try {
      const analyticsEvent: AnalyticsEvent = {
        event,
        category: properties.category || 'general',
        action: properties.action || event,
        label: properties.label,
        value: properties.value,
        userId: this.userId, // This can be undefined for public routes - that's OK
        sessionId: this.sessionId,
        timestamp: Date.now(),
        properties: {
          ...properties,
          url: window.location.href,
          referrer: document.referrer,
          userAgent: navigator.userAgent,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          // Add context about authentication state
          isAuthenticated: !!this.userId,
          isPublicRoute: this.isPublicRoute(window.location.pathname)
        }
      };

      this.events.push(analyticsEvent);

      // Auto-flush if batch size reached
      if (this.events.length >= this.batchSize) {
        this.flush();
      }
    } catch (error) {
      // Silently handle tracking errors to prevent breaking the user experience
      // Only log errors for authenticated routes or critical tracking failures
      if (this.userId || properties.category === 'error') {
        console.warn('Analytics tracking failed:', error);
      }
    }
  }

  // Authentication flow tracking
  trackAuthFlow(step: string, success: boolean, metadata: Record<string, any> = {}): void {
    this.track('auth_flow', {
      category: 'authentication',
      action: step,
      success,
      ...metadata
    });
  }

  // User flow tracking with timing
  trackUserFlow(flow: string, step: string, success: boolean, startTime?: number, metadata: Record<string, any> = {}): void {
    const duration = startTime ? Date.now() - startTime : undefined;
    
    this.track('user_flow', {
      category: 'user_journey',
      action: `${flow}_${step}`,
      flow,
      step,
      success,
      duration,
      ...metadata
    });
  }

  // Performance tracking
  trackPerformance(metric: string, value: number, metadata: Record<string, any> = {}): void {
    this.track('performance', {
      category: 'performance',
      action: metric,
      value,
      page: window.location.pathname,
      ...metadata
    });
  }

  // Error tracking
  trackError(error: Error | string, context: Record<string, any> = {}): void {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'object' ? error.stack : undefined;

    // Filter out errors that are expected on public routes
    if (typeof window !== 'undefined') {
      const isPublic = this.isPublicRoute(window.location.pathname);
      
      // Don't track auth-related errors on public routes as they're expected
      if (isPublic && this.isAuthRelatedError(errorMessage)) {
        return;
      }
    }

    this.track('error', {
      category: 'error',
      action: 'javascript_error',
      label: errorMessage,
      error: errorMessage,
      stack: errorStack,
      route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      hasUserId: !!this.userId,
      ...context
    });
  }

  public isAuthRelatedError(errorMessage: string): boolean {
    const authErrorPatterns = [
      'auth session missing',
      'user not authenticated',
      'no user session',
      'authentication required',
      'invalid session',
      'session expired',
      'unauthorized'
    ];
    
    const lowerMessage = errorMessage.toLowerCase();
    return authErrorPatterns.some(pattern => lowerMessage.includes(pattern));
  }

  // Conversion tracking
  trackConversion(event: string, value?: number, metadata: Record<string, any> = {}): void {
    this.track('conversion', {
      category: 'conversion',
      action: event,
      value,
      ...metadata
    });
  }

  // Engagement tracking
  trackEngagement(action: string, element?: string, metadata: Record<string, any> = {}): void {
    this.track('engagement', {
      category: 'engagement',
      action,
      label: element,
      ...metadata
    });
  }

  // Page view tracking
  trackPageView(page?: string): void {
    this.track('page_view', {
      category: 'navigation',
      action: 'page_view',
      page: page || window.location.pathname,
      title: document.title
    });
  }

  // Custom event tracking with timing
  startTiming(eventName: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.track('timing', {
        category: 'timing',
        action: eventName,
        value: duration
      });
    };
  }

  // Flush events to server
  private async flush(immediate: boolean = false): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    // Filter and sanitize events before sending
    const sanitizedEvents = eventsToSend.map(event => ({
      ...event,
      // Ensure userId is either a string or null, never undefined
      userId: event.userId || null,
      // Add metadata about the event context
      metadata: {
        ...event.properties?.metadata,
        wasAuthenticated: !!event.userId,
        routeType: event.properties?.isPublicRoute ? 'public' : 'protected'
      }
    }));

    try {
      // In a real app, this would send to your analytics endpoint
      if (immediate && navigator.sendBeacon) {
        // Use sendBeacon for reliable delivery on page unload
        navigator.sendBeacon('/api/analytics', JSON.stringify(sanitizedEvents));
      } else {
        // Regular fetch for normal operation
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sanitizedEvents)
        });

        if (!response.ok) {
          throw new Error(`Analytics API responded with ${response.status}: ${response.statusText}`);
        }
      }

      // Only log in development or for authenticated users to reduce noise
      if (this.userId || import.meta.env.DEV) {
        console.log(`Analytics: Sent ${sanitizedEvents.length} events`);
      }
    } catch (error) {
      // Only log errors for authenticated users or in development
      if (this.userId || import.meta.env.DEV) {
        console.error('Analytics: Failed to send events', error);
      }
      
      // Re-add events to queue for retry, but limit retry queue size
      if (this.events.length < 50) { // Prevent memory leaks
        this.events.unshift(...eventsToSend);
      }
    }
  }

  // Get analytics summary
  getAnalyticsSummary(): {
    sessionId: string;
    userId?: string;
    eventsQueued: number;
    isEnabled: boolean;
  } {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      eventsQueued: this.events.length,
      isEnabled: this.isEnabled
    };
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush(true);
  }
}

// Specific tracking functions for MessyOS flows
export class MessyOSAnalytics {
  private tracker: AnalyticsTracker;

  constructor() {
    this.tracker = new AnalyticsTracker();
  }

  // Landing page interactions
  trackLandingPageView(): void {
    try {
      this.tracker.trackPageView('/');
      this.tracker.track('landing_page_view', {
        category: 'marketing',
        action: 'landing_page_view',
        isPublicRoute: true
      });
    } catch (error) {
      // Silently handle errors on public routes
      if (import.meta.env.DEV) {
        console.warn('Failed to track landing page view:', error);
      }
    }
  }

  trackWaitlistSignup(email: string, source?: string): void {
    try {
      this.tracker.trackConversion('waitlist_signup', 1, {
        source,
        hasEmail: !!email,
        isPublicRoute: true
      });
    } catch (error) {
      // This is important conversion tracking, so log it
      console.warn('Failed to track waitlist signup:', error);
    }
  }

  trackWaitlistError(error: string): void {
    try {
      this.tracker.trackError(error, {
        context: 'waitlist_signup',
        isPublicRoute: true
      });
    } catch (trackingError) {
      // Don't let tracking errors break the user experience
      if (import.meta.env.DEV) {
        console.warn('Failed to track waitlist error:', trackingError);
      }
    }
  }

  // Authentication flow
  trackAuthStart(method: 'email' | 'google' | 'github'): void {
    this.tracker.trackAuthFlow('auth_start', true, { method });
  }

  trackAuthSuccess(method: string, isNewUser: boolean): void {
    this.tracker.trackAuthFlow('auth_success', true, { method, isNewUser });
    this.tracker.trackConversion('user_signup', 1, { method, isNewUser });
  }

  trackAuthError(method: string, error: string): void {
    this.tracker.trackAuthFlow('auth_error', false, { method, error });
  }

  // Token system
  trackTokenAllocation(amount: number, userId: string): void {
    this.tracker.setUserId(userId);
    this.tracker.track('token_allocation', {
      category: 'tokens',
      action: 'initial_allocation',
      value: amount
    });
  }

  trackTokenUsage(amount: number, feature: string, remainingBalance: number): void {
    this.tracker.track('token_usage', {
      category: 'tokens',
      action: 'token_spent',
      value: amount,
      feature,
      remainingBalance
    });
  }

  // Onboarding flow
  trackOnboardingStart(): void {
    this.tracker.trackUserFlow('onboarding', 'start', true);
  }

  trackOnboardingStep(step: string, completed: boolean, data?: Record<string, any>): void {
    this.tracker.trackUserFlow('onboarding', step, completed, undefined, data);
  }

  trackOnboardingComplete(totalTime: number): void {
    this.tracker.trackUserFlow('onboarding', 'complete', true, undefined, { totalTime });
    this.tracker.trackConversion('onboarding_complete', 1, { totalTime });
  }

  // Dashboard interactions
  trackDashboardView(): void {
    this.tracker.trackPageView('/dashboard');
  }

  trackFeatureUsage(feature: string, action: string, metadata?: Record<string, any>): void {
    this.tracker.trackEngagement(`${feature}_${action}`, feature, metadata);
  }

  // Performance tracking
  trackPageLoadTime(page: string, loadTime: number): void {
    this.tracker.trackPerformance('page_load_time', loadTime, { page });
  }

  trackAPIResponse(endpoint: string, responseTime: number, success: boolean): void {
    this.tracker.trackPerformance('api_response_time', responseTime, {
      endpoint,
      success
    });
  }

  // Mobile-specific tracking
  trackMobileInteraction(interaction: string, element: string): void {
    this.tracker.trackEngagement('mobile_interaction', element, {
      interaction,
      isMobile: true,
      touchDevice: 'ontouchstart' in window
    });
  }

  trackPWAInstall(): void {
    this.tracker.trackConversion('pwa_install', 1);
  }

  trackPWAUsage(): void {
    this.tracker.track('pwa_usage', {
      category: 'pwa',
      action: 'app_launch',
      standalone: window.matchMedia('(display-mode: standalone)').matches
    });
  }

  // Error tracking
  trackJavaScriptError(error: Error, componentStack?: string): void {
    this.tracker.trackError(error, {
      componentStack,
      context: 'react_component'
    });
  }

  trackNetworkError(url: string, status: number, statusText: string): void {
    this.tracker.trackError(`Network error: ${status} ${statusText}`, {
      url,
      status,
      statusText,
      context: 'network_request'
    });
  }

  // User behavior patterns
  trackUserSession(duration: number, pageViews: number, interactions: number): void {
    this.tracker.track('session_summary', {
      category: 'engagement',
      action: 'session_end',
      duration,
      pageViews,
      interactions
    });
  }

  // A/B testing support
  trackExperiment(experimentName: string, variant: string, converted: boolean): void {
    this.tracker.track('experiment', {
      category: 'experiment',
      action: experimentName,
      label: variant,
      converted
    });
  }

  // Utility methods
  setUserId(userId: string): void {
    this.tracker.setUserId(userId);
  }

  enable(): void {
    this.tracker.enable();
  }

  disable(): void {
    this.tracker.disable();
  }

  getSummary(): any {
    return this.tracker.getAnalyticsSummary();
  }
}

// Export singleton instance
export const analytics = new MessyOSAnalytics();

// React hook for analytics
export function useAnalytics() {
  return {
    track: analytics.tracker.track.bind(analytics.tracker),
    trackPageView: analytics.trackDashboardView.bind(analytics),
    trackFeatureUsage: analytics.trackFeatureUsage.bind(analytics),
    trackError: analytics.trackJavaScriptError.bind(analytics),
    startTiming: analytics.tracker.startTiming.bind(analytics.tracker)
  };
}

// Higher-order component for automatic page tracking
export function withAnalytics<P extends object>(
  Component: React.ComponentType<P>,
  pageName?: string
) {
  return function AnalyticsWrapper(props: P) {
    React.useEffect(() => {
      analytics.trackPageLoadTime(pageName || 'unknown', performance.now());
    }, []);

    return React.createElement(Component, props);
  };
}

// Auto-initialize analytics
if (typeof window !== 'undefined') {
  // Track initial page load
  window.addEventListener('load', () => {
    try {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      analytics.trackPageLoadTime(window.location.pathname, loadTime);
    } catch (error) {
      // Don't let analytics errors break the page
      if (import.meta.env.DEV) {
        console.warn('Failed to track page load time:', error);
      }
    }
  });

  // Track PWA usage
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      analytics.trackPWAUsage();
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Failed to track PWA usage:', error);
    }
  }

  // Track unhandled errors (but filter out auth-related errors on public routes)
  window.addEventListener('error', (event) => {
    try {
      // Don't track auth errors on public routes
      const isPublic = analytics.tracker.isPublicRoute?.(window.location.pathname) ?? false;
      const isAuthError = event.error?.message && 
        (analytics.tracker.isAuthRelatedError?.(event.error.message) ?? false);
      
      if (isPublic && isAuthError) {
        return; // Skip tracking expected auth errors on public routes
      }
      
      analytics.trackJavaScriptError(event.error, event.filename);
    } catch (trackingError) {
      // Don't let tracking errors create more errors
      if (import.meta.env.DEV) {
        console.warn('Failed to track JavaScript error:', trackingError);
      }
    }
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    try {
      const error = new Error(event.reason);
      const isPublic = analytics.tracker.isPublicRoute?.(window.location.pathname) ?? false;
      const isAuthError = (analytics.tracker.isAuthRelatedError?.(error.message) ?? false);
      
      if (isPublic && isAuthError) {
        return; // Skip tracking expected auth errors on public routes
      }
      
      analytics.trackJavaScriptError(error, 'unhandled_promise');
    } catch (trackingError) {
      if (import.meta.env.DEV) {
        console.warn('Failed to track promise rejection:', trackingError);
      }
    }
  });
}