/**
 * Middleware Unit Tests
 * 
 * Tests the middleware behavior with static assets and route classification
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouteClassifier } from '../../lib/utils/route-classifier';

describe('Middleware Static Asset Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Route Classification Integration', () => {
    it('should classify static assets correctly', () => {
      const staticAssets = [
        '/icons/icon-192.png',
        '/manifest.json',
        '/favicon.ico',
        '/sw.js',
        '/offline.html',
        '/robots.txt',
        '/sitemap.xml',
        '/image.jpg',
        '/style.css',
        '/script.js'
      ];

      staticAssets.forEach(path => {
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isStatic).toBe(true);
        expect(classification.isPublic).toBe(true);
        expect(classification.requiresAuth).toBe(false);
      });
    });

    it('should classify public routes correctly', () => {
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

      publicRoutes.forEach(path => {
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isPublic).toBe(true);
        expect(classification.requiresAuth).toBe(false);
        // Root and other public routes should not be static
        expect(classification.isStatic).toBe(false);
      });
    });

    it('should classify protected routes correctly', () => {
      const protectedRoutes = [
        '/dashboard',
        '/profile',
        '/settings',
        '/wallet',
        '/tasks'
      ];

      protectedRoutes.forEach(path => {
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isPublic).toBe(false);
        expect(classification.requiresAuth).toBe(true);
        expect(classification.isStatic).toBe(false);
      });
    });

    it('should prioritize static asset classification', () => {
      // Even if a static asset path might look like it could be public,
      // it should be classified as static first
      const staticAssetPath = '/icons/login.png';
      const classification = RouteClassifier.classifyRoute(staticAssetPath);
      
      expect(classification.isStatic).toBe(true);
      expect(classification.isPublic).toBe(true);
      expect(classification.requiresAuth).toBe(false);
      expect(classification.matchedPattern).toBe('PWA Icons');
    });
  });

  describe('Logging Behavior', () => {
    it('should provide appropriate log messages for different route types', () => {
      const testCases = [
        {
          path: '/icons/icon-192.png',
          expectedType: 'static',
          expectedPattern: 'PWA Icons'
        },
        {
          path: '/manifest.json',
          expectedType: 'static',
          expectedPattern: 'PWA Manifest'
        },
        {
          path: '/login',
          expectedType: 'public',
          expectedPattern: 'Public Route'
        },
        {
          path: '/dashboard',
          expectedType: 'protected',
          expectedPattern: 'Protected Route'
        }
      ];

      testCases.forEach(({ path, expectedType, expectedPattern }) => {
        const classification = RouteClassifier.classifyRoute(path);
        
        if (expectedType === 'static') {
          expect(classification.isStatic).toBe(true);
        } else if (expectedType === 'public') {
          expect(classification.isPublic).toBe(true);
          expect(classification.isStatic).toBe(false);
        } else if (expectedType === 'protected') {
          expect(classification.requiresAuth).toBe(true);
          expect(classification.isStatic).toBe(false);
        }
        
        expect(classification.matchedPattern).toBe(expectedPattern);
      });
    });
  });
});