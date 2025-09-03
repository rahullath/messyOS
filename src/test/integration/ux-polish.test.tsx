// src/test/integration/ux-polish.test.tsx - Integration tests for UX polish features
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedLayout } from '../../components/layout/EnhancedLayout';
import { LoadingState, PageTransition, LoadingButton } from '../../components/ui/LoadingStates';
import { SuccessAnimation, Toast, FeedbackButton } from '../../components/ui/SuccessAnimations';
import { UXOptimizer, useUXOptimization } from '../../components/ux/UXOptimizer';
import { analytics } from '../../lib/analytics/tracking';

// Mock analytics
vi.mock('../../lib/analytics/tracking', () => ({
  analytics: {
    track: vi.fn(),
    trackPageView: vi.fn(),
    trackEngagement: vi.fn(),
    trackPerformance: vi.fn(),
    trackError: vi.fn(),
    trackPageLoadTime: vi.fn(),
    trackJavaScriptError: vi.fn(),
    getSummary: vi.fn(() => ({ eventsQueued: 0 })),
    tracker: {
      track: vi.fn(),
      startTiming: vi.fn(() => vi.fn())
    }
  }
}));

// Mock performance APIs
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    getEntriesByType: vi.fn(() => []),
    timing: {
      navigationStart: Date.now() - 1000,
      loadEventEnd: Date.now()
    }
  }
});

// Mock navigator APIs
Object.defineProperty(navigator, 'hardwareConcurrency', {
  value: 4,
  writable: true
});

Object.defineProperty(navigator, 'deviceMemory', {
  value: 8,
  writable: true
});

Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false
  },
  writable: true
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true
});

describe('UX Polish Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    document.head.querySelectorAll('style').forEach(style => {
      if (style.id?.includes('ux') || style.id?.includes('enhanced')) {
        style.remove();
      }
    });
  });

  describe('Loading States', () => {
    it('should render different loading state types', () => {
      render(
        <div>
          <div data-testid="spinner">
            <LoadingState type="spinner" />
          </div>
          <div data-testid="skeleton">
            <LoadingState type="skeleton" />
          </div>
          <div data-testid="dots">
            <LoadingState type="dots" />
          </div>
          <div data-testid="progress">
            <LoadingState type="progress" progress={50} />
          </div>
        </div>
      );

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('dots')).toBeInTheDocument();
      expect(screen.getByTestId('progress')).toBeInTheDocument();
    });

    it('should show loading button states correctly', async () => {
      const handleClick = vi.fn();
      
      render(
        <LoadingButton 
          onClick={handleClick}
          isLoading={false}
          data-testid="loading-button"
        >
          Click me
        </LoadingButton>
      );

      const button = screen.getByTestId('loading-button');
      expect(button).toHaveTextContent('Click me');
      
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalled();
    });

    it('should handle page transitions with analytics', async () => {
      const { rerender } = render(
        <PageTransition isLoading={false} pageName="test-page">
          <div>Content</div>
        </PageTransition>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();

      rerender(
        <PageTransition isLoading={true} pageName="test-page">
          <div>Content</div>
        </PageTransition>
      );

      await waitFor(() => {
        expect(analytics.track).toHaveBeenCalledWith(
          'page_transition_start',
          expect.objectContaining({
            page: 'test-page'
          })
        );
      });
    });
  });

  describe('Success Animations', () => {
    it('should render success animations with analytics tracking', async () => {
      render(
        <SuccessAnimation 
          type="checkmark" 
          message="Success!" 
          duration={1000}
          data-testid="success-animation"
        />
      );

      expect(screen.getByText('Success!')).toBeInTheDocument();
      
      await waitFor(() => {
        expect(analytics.trackEngagement).toHaveBeenCalledWith(
          'success_animation',
          'checkmark',
          expect.objectContaining({
            message: 'Success!'
          })
        );
      });
    });

    it('should show and hide toast notifications', async () => {
      const onClose = vi.fn();
      
      render(
        <Toast 
          type="success"
          message="Test notification"
          duration={1000}
          onClose={onClose}
        />
      );

      expect(screen.getByText('Test notification')).toBeInTheDocument();
      
      // Toast should auto-close after duration
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      }, { timeout: 1500 });
    });

    it('should handle feedback button interactions', () => {
      const handleClick = vi.fn();
      
      render(
        <FeedbackButton
          onClick={handleClick}
          feedbackMessage="Button clicked!"
          data-testid="feedback-button"
        >
          Click for feedback
        </FeedbackButton>
      );

      const button = screen.getByTestId('feedback-button');
      fireEvent.click(button);
      
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('UX Optimization', () => {
    it('should detect device capabilities and optimize accordingly', async () => {
      // Mock low-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2 });
      Object.defineProperty(navigator, 'deviceMemory', { value: 2 });

      const TestComponent = () => {
        const { optimizationLevel, shouldReduceAnimations } = useUXOptimization();
        return (
          <div>
            <span data-testid="optimization-level">{optimizationLevel}</span>
            <span data-testid="reduce-animations">{shouldReduceAnimations.toString()}</span>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('optimization-level')).toHaveTextContent('aggressive');
        expect(screen.getByTestId('reduce-animations')).toHaveTextContent('true');
      });
    });

    it('should apply accessibility optimizations', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(<UXOptimizer />);

      // Should apply reduced motion class
      expect(document.documentElement).toHaveClass('reduce-motion');
    });

    it('should optimize for slow network conditions', async () => {
      // Mock slow network
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: 'slow-2g',
          downlink: 0.5,
          rtt: 2000,
          saveData: true
        }
      });

      const TestComponent = () => {
        const { isSlowNetwork, optimizationLevel } = useUXOptimization();
        return (
          <div>
            <span data-testid="is-slow-network">{isSlowNetwork.toString()}</span>
            <span data-testid="optimization-level">{optimizationLevel}</span>
          </div>
        );
      };

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('optimization-level')).toHaveTextContent('aggressive');
      });
    });
  });

  describe('Enhanced Layout Integration', () => {
    it('should integrate all UX components correctly', async () => {
      render(
        <EnhancedLayout pageName="test-page" showPerformanceMonitor={true}>
          <div>Test content</div>
        </EnhancedLayout>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
      
      // Should track page view
      expect(analytics.trackPageView).toHaveBeenCalledWith('test-page');
    });

    it('should handle global error boundaries', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      render(
        <EnhancedLayout>
          <ErrorComponent />
        </EnhancedLayout>
      );

      // Should handle error gracefully
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });

    it('should handle network status changes', async () => {
      render(
        <EnhancedLayout>
          <div>Content</div>
        </EnhancedLayout>
      );

      // Simulate going offline
      fireEvent(window, new Event('offline'));
      
      await waitFor(() => {
        expect(analytics.track).toHaveBeenCalledWith(
          'network_offline',
          expect.objectContaining({
            category: 'network',
            action: 'connection_lost'
          })
        );
      });

      // Simulate coming back online
      fireEvent(window, new Event('online'));
      
      await waitFor(() => {
        expect(analytics.track).toHaveBeenCalledWith(
          'network_online',
          expect.objectContaining({
            category: 'network',
            action: 'connection_restored'
          })
        );
      });
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track performance metrics', async () => {
      // Mock performance entries
      window.performance.getEntriesByType = vi.fn().mockReturnValue([
        {
          name: 'navigation',
          loadEventEnd: 1000,
          loadEventStart: 100,
          domContentLoadedEventEnd: 800,
          domContentLoadedEventStart: 200
        }
      ]);

      render(
        <EnhancedLayout>
          <div>Content</div>
        </EnhancedLayout>
      );

      // Simulate page load
      fireEvent(window, new Event('load'));

      await waitFor(() => {
        expect(analytics.track).toHaveBeenCalled();
      });
    });
  });

  describe('Bundle Optimization', () => {
    it('should track bundle loading performance', async () => {
      // Mock resource timing entries
      const mockResourceEntry = {
        name: 'https://example.com/bundle.js',
        transferSize: 150000, // 150KB
        duration: 1200, // 1.2s
        encodedBodySize: 100000
      };

      // Simulate PerformanceObserver callback
      const mockObserver = {
        observe: vi.fn(),
        disconnect: vi.fn()
      };

      window.PerformanceObserver = vi.fn().mockImplementation((callback) => {
        // Simulate immediate callback with mock data
        setTimeout(() => {
          callback({
            getEntries: () => [mockResourceEntry]
          });
        }, 100);
        return mockObserver;
      });

      render(
        <EnhancedLayout>
          <div>Content</div>
        </EnhancedLayout>
      );

      await waitFor(() => {
        expect(analytics.trackPerformance).toHaveBeenCalledWith(
          'large_bundle_detected',
          150000,
          expect.objectContaining({
            url: 'https://example.com/bundle.js',
            loadTime: 1200
          })
        );
      }, { timeout: 2000 });
    });
  });

  describe('Accessibility Features', () => {
    it('should provide skip navigation link', () => {
      render(
        <EnhancedLayout>
          <div>Content</div>
        </EnhancedLayout>
      );

      const skipLink = screen.getByText('Skip to main content');
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    it('should manage focus for screen readers', () => {
      render(
        <EnhancedLayout>
          <div>Content</div>
        </EnhancedLayout>
      );

      const mainContent = document.querySelector('#main-content');
      expect(mainContent).toBeInTheDocument();
      expect(mainContent).toHaveAttribute('tabIndex', '-1');
    });
  });
});

describe('Analytics Integration', () => {
  it('should track user interactions comprehensively', async () => {
    render(
      <EnhancedLayout pageName="analytics-test">
        <FeedbackButton feedbackMessage="Clicked!">
          Test Button
        </FeedbackButton>
      </EnhancedLayout>
    );

    const button = screen.getByText('Test Button');
    fireEvent.click(button);

    // Should track page view
    expect(analytics.trackPageView).toHaveBeenCalledWith('analytics-test');
    
    // Should track engagement
    expect(analytics.trackEngagement).toHaveBeenCalled();
  });

  it('should batch and send analytics events', async () => {
    // Mock fetch for analytics endpoint
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    // Trigger multiple analytics events
    analytics.track('test_event_1', { category: 'test' });
    analytics.track('test_event_2', { category: 'test' });
    analytics.track('test_event_3', { category: 'test' });

    // Wait for batch to be sent
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/analytics',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });
});