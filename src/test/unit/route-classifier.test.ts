import { describe, it, expect } from 'vitest';
import { RouteClassifier } from '../../lib/utils/route-classifier';

describe('RouteClassifier', () => {
  describe('Static Asset Detection', () => {
    it('should identify PWA icons as static assets', () => {
      const testCases = [
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/icons/apple-touch-icon.png',
        '/icons/favicon.ico'
      ];

      testCases.forEach(path => {
        expect(RouteClassifier.isStaticAsset(path)).toBe(true);
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isStatic).toBe(true);
        expect(classification.isPublic).toBe(true);
        expect(classification.requiresAuth).toBe(false);
        expect(classification.matchedPattern).toBe('PWA Icons');
      });
    });

    it('should identify PWA manifest as static asset', () => {
      const path = '/manifest.json';
      expect(RouteClassifier.isStaticAsset(path)).toBe(true);
      
      const classification = RouteClassifier.classifyRoute(path);
      expect(classification.isStatic).toBe(true);
      expect(classification.isPublic).toBe(true);
      expect(classification.requiresAuth).toBe(false);
      expect(classification.matchedPattern).toBe('PWA Manifest');
    });

    it('should identify service worker as static asset', () => {
      const path = '/sw.js';
      expect(RouteClassifier.isStaticAsset(path)).toBe(true);
      
      const classification = RouteClassifier.classifyRoute(path);
      expect(classification.isStatic).toBe(true);
      expect(classification.isPublic).toBe(true);
      expect(classification.requiresAuth).toBe(false);
      expect(classification.matchedPattern).toBe('Service Worker');
    });

    it('should identify favicon files as static assets', () => {
      const testCases = [
        '/favicon.ico',
        '/favicon.png',
        '/favicon.svg'
      ];

      testCases.forEach(path => {
        expect(RouteClassifier.isStaticAsset(path)).toBe(true);
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isStatic).toBe(true);
        expect(classification.matchedPattern).toBe('Favicon');
      });
    });

    it('should identify image files as static assets', () => {
      const testCases = [
        { path: '/logo.png', expectedPattern: 'Images' },
        { path: '/hero.jpg', expectedPattern: 'Images' },
        { path: '/banner.jpeg', expectedPattern: 'Images' },
        { path: '/icon.svg', expectedPattern: 'Images' },
        { path: '/favicon.ico', expectedPattern: 'Favicon' }, // This matches favicon pattern first
        { path: '/image.webp', expectedPattern: 'Images' },
        { path: '/photo.gif', expectedPattern: 'Images' },
        { path: '/picture.bmp', expectedPattern: 'Images' }
      ];

      testCases.forEach(({ path, expectedPattern }) => {
        expect(RouteClassifier.isStaticAsset(path)).toBe(true);
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isStatic).toBe(true);
        expect(classification.matchedPattern).toBe(expectedPattern);
      });
    });

    it('should identify other static assets', () => {
      const testCases = [
        '/styles.css',
        '/script.js',
        '/font.woff',
        '/font.woff2',
        '/font.ttf',
        '/font.eot'
      ];

      testCases.forEach(path => {
        expect(RouteClassifier.isStaticAsset(path)).toBe(true);
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isStatic).toBe(true);
        expect(classification.matchedPattern).toBe('Static Assets');
      });
    });

    it('should identify SEO files as static assets', () => {
      const testCases = [
        '/robots.txt',
        '/sitemap.xml'
      ];

      testCases.forEach(path => {
        expect(RouteClassifier.isStaticAsset(path)).toBe(true);
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isStatic).toBe(true);
        expect(classification.matchedPattern).toMatch(/Robots|Sitemap/);
      });
    });

    it('should identify offline page as static asset', () => {
      const path = '/offline.html';
      expect(RouteClassifier.isStaticAsset(path)).toBe(true);
      
      const classification = RouteClassifier.classifyRoute(path);
      expect(classification.isStatic).toBe(true);
      expect(classification.matchedPattern).toBe('Offline Page');
    });

    it('should handle case insensitive image extensions', () => {
      const testCases = [
        '/image.PNG',
        '/photo.JPG',
        '/icon.SVG',
        '/banner.WEBP'
      ];

      testCases.forEach(path => {
        expect(RouteClassifier.isStaticAsset(path)).toBe(true);
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isStatic).toBe(true);
      });
    });
  });

  describe('Public Route Detection', () => {
    it('should identify public routes correctly', () => {
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
        expect(RouteClassifier.isPublicRoute(path)).toBe(true);
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isPublic).toBe(true);
        expect(classification.isStatic).toBe(false);
        expect(classification.requiresAuth).toBe(false);
        expect(classification.matchedPattern).toBe('Public Route');
      });
    });

    it('should not identify protected routes as public', () => {
      const protectedRoutes = [
        '/dashboard',
        '/profile',
        '/settings',
        '/wallet',
        '/tasks'
      ];

      protectedRoutes.forEach(path => {
        expect(RouteClassifier.isPublicRoute(path)).toBe(false);
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isPublic).toBe(false);
        expect(classification.isStatic).toBe(false);
        expect(classification.requiresAuth).toBe(true);
        expect(classification.matchedPattern).toBe('Protected Route');
      });
    });
  });

  describe('Route Classification', () => {
    it('should prioritize static asset classification over public routes', () => {
      // Even if a static asset path might match a public route pattern,
      // it should be classified as static first
      const path = '/favicon.ico';
      const classification = RouteClassifier.classifyRoute(path);
      
      expect(classification.isStatic).toBe(true);
      expect(classification.isPublic).toBe(true);
      expect(classification.requiresAuth).toBe(false);
      expect(classification.matchedPattern).toBe('Favicon'); // Favicon pattern matches first
    });

    it('should handle API routes as non-static, non-public by default', () => {
      const apiRoutes = [
        '/api/user',
        '/api/auth/session',
        '/api/tokens'
      ];

      apiRoutes.forEach(path => {
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isStatic).toBe(false);
        expect(classification.isPublic).toBe(false);
        expect(classification.requiresAuth).toBe(true);
        expect(classification.matchedPattern).toBe('Protected Route');
      });
    });

    it('should handle edge cases correctly', () => {
      const edgeCases = [
        { path: '', expected: { isStatic: false, isPublic: false, requiresAuth: true } },
        { path: '/unknown-route', expected: { isStatic: false, isPublic: false, requiresAuth: true } },
        { path: '/icons', expected: { isStatic: false, isPublic: false, requiresAuth: true } }, // Not /icons/*
        { path: '/manifest', expected: { isStatic: false, isPublic: false, requiresAuth: true } }, // Not manifest.json
      ];

      edgeCases.forEach(({ path, expected }) => {
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isStatic).toBe(expected.isStatic);
        expect(classification.isPublic).toBe(expected.isPublic);
        expect(classification.requiresAuth).toBe(expected.requiresAuth);
      });
    });
  });

  describe('Utility Methods', () => {
    it('should return static asset patterns', () => {
      const patterns = RouteClassifier.getStaticAssetPatterns();
      expect(patterns).toHaveLength(9); // Based on our defined patterns
      expect(patterns[0]).toHaveProperty('pattern');
      expect(patterns[0]).toHaveProperty('description');
    });

    it('should return public routes', () => {
      const routes = RouteClassifier.getPublicRoutes();
      expect(routes).toHaveLength(8); // Based on our defined public routes
      expect(routes).toContain('/');
      expect(routes).toContain('/login');
    });

    it('should provide requiresAuth helper method', () => {
      expect(RouteClassifier.requiresAuth('/dashboard')).toBe(true);
      expect(RouteClassifier.requiresAuth('/login')).toBe(false);
      expect(RouteClassifier.requiresAuth('/icons/icon.png')).toBe(false);
    });

    it('should provide getStaticAssetMatch helper method', () => {
      const match = RouteClassifier.getStaticAssetMatch('/icons/icon.png');
      expect(match).not.toBeNull();
      expect(match?.description).toBe('PWA Icons');

      const noMatch = RouteClassifier.getStaticAssetMatch('/dashboard');
      expect(noMatch).toBeNull();
    });
  });
});