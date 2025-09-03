// src/test/integration/analytics-public-routes.test.tsx - Integration test for analytics on public routes
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analytics } from '../../lib/analytics/tracking';

// Mock fetch for analytics
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock successful analytics API response
mockFetch.mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true, processed: 1 })
});

describe('Analytics on Public Routes Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset analytics state
    analytics.disable();
    analytics.enable();
    
    // Ensure no user ID is set (simulating unauthenticated user)
    (analytics as any).tracker.userId = undefined;
    (analytics as any).tracker.events = [];
  });

  afterEach(() => {
    analytics.disable();
  });

  it('should track landing page view without errors when user is not authenticated', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock window.location for public route
    Object.defineProperty(window, 'location', {
      value: { pathname: '/', href: 'http://localhost:3000/' },
      writable: true
    });
    
    // Track landing page view directly
    analytics.trackLandingPageView();

    // Should not have any console errors
    expect(consoleSpy).not.toHaveBeenCalled();
    
    // Should have tracked events
    expect(analytics.getSummary().eventsQueued).toBeGreaterThan(0);
    
    // Should not have a user ID
    expect(analytics.getSummary().userId).toBeUndefined();
    
    consoleSpy.mockRestore();
  });

  it('should handle analytics errors gracefully', async () => {
    // Mock analytics to throw an error
    const originalTrack = (analytics as any).tracker.track;
    (analytics as any).tracker.track = vi.fn(() => {
      throw new Error('Analytics service unavailable');
    });
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // This should not throw
    expect(() => {
      analytics.trackLandingPageView();
    }).not.toThrow();
    
    // Restore original function
    (analytics as any).tracker.track = originalTrack;
    consoleSpy.mockRestore();
  });

  it('should send analytics events with null userId for unauthenticated users', async () => {
    // Track landing page view
    analytics.trackLandingPageView();

    // Manually flush analytics to trigger API call
    await (analytics as any).tracker.flush();
    
    // Should have called fetch with analytics data
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/analytics',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"userId":null')
      })
    );
  });

  it('should not track auth-related errors on public routes', async () => {
    // Mock window.location to be on public route
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true
    });
    
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Simulate an auth-related error on a public route
    analytics.trackJavaScriptError(new Error('Auth session missing'), 'landing-component');
    
    // Should not have tracked the error (events queue should be empty or not contain error events)
    const summary = analytics.getSummary();
    expect(summary.eventsQueued).toBe(0);
    
    consoleSpy.mockRestore();
  });

  it('should track non-auth errors on public routes', async () => {
    // Mock window.location to be on public route
    Object.defineProperty(window, 'location', {
      value: { pathname: '/' },
      writable: true
    });
    
    // Simulate a non-auth error on a public route
    analytics.trackJavaScriptError(new Error('Network connection failed'), 'landing-component');
    
    // Should have tracked the error
    const summary = analytics.getSummary();
    expect(summary.eventsQueued).toBeGreaterThan(0);
  });

  it('should include route context in analytics events', async () => {
    // Track landing page view
    analytics.trackLandingPageView();

    // Manually flush analytics
    await (analytics as any).tracker.flush();
    
    // Check that the analytics payload includes route context
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/analytics',
      expect.objectContaining({
        body: expect.stringContaining('"isPublicRoute":true')
      })
    );
  });
});