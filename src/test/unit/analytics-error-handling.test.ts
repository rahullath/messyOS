// src/test/unit/analytics-error-handling.test.ts - Test analytics error handling for public routes
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analytics } from '../../lib/analytics/tracking';

// Mock window and location
const mockLocation = {
  pathname: '/',
  href: 'http://localhost:3000/',
};

const mockWindow = {
  location: mockLocation,
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: vi.fn(),
  matchMedia: vi.fn(() => ({ matches: false })),
};

// Mock navigator
const mockNavigator = {
  userAgent: 'test-agent',
  sendBeacon: vi.fn(),
};

// Mock document
const mockDocument = {
  referrer: '',
  addEventListener: vi.fn(),
};

// Mock fetch
const mockFetch = vi.fn();

describe('Analytics Error Handling for Public Routes', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup global mocks
    global.window = mockWindow as any;
    global.navigator = mockNavigator as any;
    global.document = mockDocument as any;
    global.fetch = mockFetch;
    
    // Mock successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    // Reset analytics state - create fresh instance
    analytics.disable();
    analytics.enable();
    
    // Clear any existing user ID
    (analytics as any).tracker.userId = undefined;
    (analytics as any).tracker.events = [];
  });

  afterEach(() => {
    // Clean up
    delete (global as any).window;
    delete (global as any).navigator;
    delete (global as any).document;
    delete (global as any).fetch;
  });

  describe('Public Route Detection', () => {
    it('should identify public routes correctly', () => {
      const publicRoutes = [
        '/',
        '/landing',
        '/login',
        '/auth/callback',
        '/reset-password'
      ];

      publicRoutes.forEach(route => {
        expect(analytics.tracker.isPublicRoute(route)).toBe(true);
      });
    });

    it('should identify static assets as public', () => {
      const staticAssets = [
        '/icons/icon-192.png',
        '/manifest.json',
        '/favicon.ico',
        '/sw.js',
        '/robots.txt',
        '/image.jpg'
      ];

      staticAssets.forEach(asset => {
        expect(analytics.tracker.isPublicRoute(asset)).toBe(true);
      });
    });

    it('should identify protected routes correctly', () => {
      const protectedRoutes = [
        '/dashboard',
        '/profile',
        '/settings',
        '/api/user/data'
      ];

      protectedRoutes.forEach(route => {
        expect(analytics.tracker.isPublicRoute(route)).toBe(false);
      });
    });
  });

  describe('Auth Error Detection', () => {
    it('should identify auth-related errors', () => {
      const authErrors = [
        'Auth session missing',
        'User not authenticated',
        'No user session found',
        'Authentication required',
        'Invalid session token',
        'Session expired',
        'Unauthorized access'
      ];

      authErrors.forEach(error => {
        expect(analytics.tracker.isAuthRelatedError(error)).toBe(true);
      });
    });

    it('should not identify non-auth errors as auth-related', () => {
      const nonAuthErrors = [
        'Network connection failed',
        'Invalid input data',
        'Server error 500',
        'Resource not found',
        'Validation failed'
      ];

      nonAuthErrors.forEach(error => {
        expect(analytics.tracker.isAuthRelatedError(error)).toBe(false);
      });
    });
  });

  describe('Error Tracking on Public Routes', () => {
    beforeEach(() => {
      // Set location to public route
      mockLocation.pathname = '/';
    });

    it('should not track auth errors on public routes', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Track an auth error on a public route
      analytics.trackJavaScriptError(new Error('Auth session missing'), 'test-component');
      
      // Should not have made any fetch calls (no events tracked)
      expect(mockFetch).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should track non-auth errors on public routes', () => {
      // Track a non-auth error on a public route
      analytics.trackJavaScriptError(new Error('Network connection failed'), 'test-component');
      
      // Should track the error
      expect(analytics.getSummary().eventsQueued).toBeGreaterThan(0);
    });

    it('should track events without user ID on public routes', () => {
      // Ensure no user ID is set
      expect(analytics.getSummary().userId).toBeUndefined();
      
      // Track landing page view
      analytics.trackLandingPageView();
      
      // Should successfully track without errors
      expect(analytics.getSummary().eventsQueued).toBeGreaterThan(0);
    });
  });

  describe('Error Tracking on Protected Routes', () => {
    beforeEach(() => {
      // Set location to protected route
      mockLocation.pathname = '/dashboard';
    });

    it('should track auth errors on protected routes', () => {
      // Track an auth error on a protected route
      analytics.trackJavaScriptError(new Error('Auth session missing'), 'dashboard-component');
      
      // Should track the error
      expect(analytics.getSummary().eventsQueued).toBeGreaterThan(0);
    });

    it('should track all errors on protected routes', () => {
      // Clear any existing events first
      (analytics as any).tracker.events = [];
      
      // Track various errors on protected routes
      analytics.trackJavaScriptError(new Error('Network error'), 'component1');
      analytics.trackJavaScriptError(new Error('Validation failed'), 'component2');
      
      // Should track both errors
      expect(analytics.getSummary().eventsQueued).toBe(2);
    });
  });

  describe('Graceful Error Handling', () => {
    it('should handle tracking errors gracefully', () => {
      // Mock fetch to fail
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // This should not throw
      expect(() => {
        analytics.trackLandingPageView();
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });

    it('should handle undefined window gracefully', () => {
      // Temporarily remove window
      const originalWindow = global.window;
      delete (global as any).window;
      
      // This should not throw
      expect(() => {
        analytics.trackLandingPageView();
      }).not.toThrow();
      
      // Restore window
      global.window = originalWindow;
    });

    it('should sanitize events before sending', async () => {
      // Set up analytics with user ID
      analytics.setUserId('test-user-123');
      
      // Track an event
      analytics.trackLandingPageView();
      
      // Manually trigger flush
      await (analytics as any).tracker.flush();
      
      // Check that fetch was called with sanitized data
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"userId":"test-user-123"')
        })
      );
    });

    it('should handle null user IDs in events', async () => {
      // Ensure no user ID is set
      (analytics as any).tracker.userId = undefined;
      expect(analytics.getSummary().userId).toBeUndefined();
      
      // Track an event
      analytics.trackLandingPageView();
      
      // Manually trigger flush
      await (analytics as any).tracker.flush();
      
      // Check that fetch was called with null userId
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/analytics',
        expect.objectContaining({
          body: expect.stringContaining('"userId":null')
        })
      );
    });
  });

  describe('Logging Behavior', () => {
    it('should reduce logging noise for public routes', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Track events on public route without user ID
      analytics.trackLandingPageView();
      // Use the correct method name
      (analytics as any).tracker.trackEngagement('button_click', 'cta_button');
      
      // Should not log for unauthenticated public route usage
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should log for authenticated users', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // Set user ID
      analytics.setUserId('test-user');
      
      // Track and flush events
      analytics.trackLandingPageView();
      await (analytics as any).tracker.flush();
      
      // Should log for authenticated users
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Analytics: Sent')
      );
      
      consoleSpy.mockRestore();
    });
  });
});