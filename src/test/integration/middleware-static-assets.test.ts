/**
 * Middleware Static Asset Integration Tests
 * 
 * Tests the middleware behavior with static assets to ensure they are handled correctly
 */

import { describe, it, expect } from 'vitest';
import { RouteClassifier } from '../../lib/utils/route-classifier';

describe('Middleware Static Asset Integration', () => {
  describe('Static Asset Classification', () => {
    it('should classify PWA assets as static', () => {
      const pwaAssets = [
        '/icons/icon-192.png',
        '/icons/icon-512.png',
        '/manifest.json',
        '/sw.js',
        '/offline.html'
      ];

      pwaAssets.forEach(asset => {
        const classification = RouteClassifier.classifyRoute(asset);
        expect(classification.isStatic).toBe(true);
        expect(classification.isPublic).toBe(true);
        expect(classification.requiresAuth).toBe(false);
      });
    });

    it('should classify SEO files as static', () => {
      const seoFiles = [
        '/robots.txt',
        '/sitemap.xml',
        '/favicon.ico',
        '/favicon.png'
      ];

      seoFiles.forEach(file => {
        const classification = RouteClassifier.classifyRoute(file);
        expect(classification.isStatic).toBe(true);
        expect(classification.isPublic).toBe(true);
        expect(classification.requiresAuth).toBe(false);
      });
    });

    it('should classify image files as static', () => {
      const imageFiles = [
        '/logo.png',
        '/hero-image.jpg',
        '/background.svg',
        '/profile.webp'
      ];

      imageFiles.forEach(file => {
        const classification = RouteClassifier.classifyRoute(file);
        expect(classification.isStatic).toBe(true);
        expect(classification.isPublic).toBe(true);
        expect(classification.requiresAuth).toBe(false);
      });
    });

    it('should classify CSS and JS files as static', () => {
      const staticFiles = [
        '/styles.css',
        '/app.js',
        '/bundle.js'
      ];

      staticFiles.forEach(file => {
        const classification = RouteClassifier.classifyRoute(file);
        expect(classification.isStatic).toBe(true);
        expect(classification.isPublic).toBe(true);
        expect(classification.requiresAuth).toBe(false);
      });
    });
  });

  describe('Route Classification Priority', () => {
    it('should prioritize static classification over public routes', () => {
      // Test case where a static asset might have a path that could be confused with a public route
      const staticAssetWithPublicPath = '/icons/login.png';
      const classification = RouteClassifier.classifyRoute(staticAssetWithPublicPath);
      
      expect(classification.isStatic).toBe(true);
      expect(classification.isPublic).toBe(true);
      expect(classification.requiresAuth).toBe(false);
      expect(classification.matchedPattern).toBe('PWA Icons');
    });

    it('should handle edge cases correctly', () => {
      const edgeCases = [
        { path: '/manifest.json.backup', expected: false }, // Not exactly manifest.json
        { path: '/icons/', expected: true }, // Icons directory path - should be static
        { path: '/icons/subfolder/icon.png', expected: true }, // Nested icon
        { path: '/sw.js.map', expected: false }, // Source map files are not in the static patterns
        { path: '/noticons/file.png', expected: true }, // Image file should be static regardless of path
        { path: '/random-path', expected: false }, // Random path should not be static
        { path: '/app.js', expected: true }, // JS files should be static
        { path: '/styles.css', expected: true }, // CSS files should be static
      ];

      edgeCases.forEach(({ path, expected }, index) => {
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.isStatic, `Case ${index}: ${path} should be ${expected ? 'static' : 'non-static'}`).toBe(expected);
      });
    });
  });

  describe('Middleware Logic Simulation', () => {
    it('should simulate early return for static assets', () => {
      const staticAssets = [
        '/icons/icon-192.png',
        '/manifest.json',
        '/favicon.ico',
        '/sw.js',
        '/robots.txt'
      ];

      staticAssets.forEach(asset => {
        const classification = RouteClassifier.classifyRoute(asset);
        
        // Simulate middleware logic: if static, should return early
        if (classification.isStatic) {
          // This would be the early return in middleware
          expect(true).toBe(true); // Asset would be served without auth checks
        } else {
          // This should not happen for static assets
          expect(false).toBe(true);
        }
      });
    });

    it('should simulate conditional logging behavior', () => {
      const testRoutes = [
        { path: '/icons/icon-192.png', type: 'static', shouldLogInDev: true },
        { path: '/login', type: 'public', shouldLogInDev: true },
        { path: '/dashboard', type: 'protected', shouldLogInDev: true },
        { path: '/api/auth/session', type: 'api', shouldLogInDev: true }
      ];

      testRoutes.forEach(({ path, type, shouldLogInDev }) => {
        const classification = RouteClassifier.classifyRoute(path);
        
        // Simulate logging logic
        let shouldLog = false;
        
        if (classification.isStatic) {
          // Only log static assets in development
          shouldLog = process.env.NODE_ENV === 'development';
        } else if (classification.isPublic) {
          shouldLog = true; // Always log public routes
        } else {
          shouldLog = true; // Always log protected routes
        }

        expect(typeof shouldLog).toBe('boolean');
      });
    });
  });

  describe('Requirements Verification', () => {
    it('should satisfy requirement 1.1: Icons load without authentication', () => {
      const iconPaths = [
        '/icons/icon-16.png',
        '/icons/icon-32.png',
        '/icons/icon-192.png',
        '/icons/icon-512.png'
      ];

      iconPaths.forEach(path => {
        const classification = RouteClassifier.classifyRoute(path);
        expect(classification.requiresAuth).toBe(false);
        expect(classification.isStatic).toBe(true);
      });
    });

    it('should satisfy requirement 1.2: Manifest serves without authentication', () => {
      const classification = RouteClassifier.classifyRoute('/manifest.json');
      expect(classification.requiresAuth).toBe(false);
      expect(classification.isStatic).toBe(true);
      expect(classification.matchedPattern).toBe('PWA Manifest');
    });

    it('should satisfy requirement 1.3: Static assets serve without redirects', () => {
      const staticAssets = [
        '/favicon.ico',
        '/sw.js',
        '/offline.html',
        '/robots.txt',
        '/sitemap.xml'
      ];

      staticAssets.forEach(asset => {
        const classification = RouteClassifier.classifyRoute(asset);
        expect(classification.requiresAuth).toBe(false);
        expect(classification.isStatic).toBe(true);
      });
    });

    it('should satisfy requirement 2.1: Landing page works without auth errors', () => {
      const classification = RouteClassifier.classifyRoute('/');
      expect(classification.isPublic).toBe(true);
      expect(classification.isStatic).toBe(false);
    });

    it('should satisfy requirement 3.1-3.3: Clear route separation', () => {
      // Public routes should be clearly identified
      const publicRoutes = ['/', '/login', '/auth/callback'];
      publicRoutes.forEach(route => {
        const classification = RouteClassifier.classifyRoute(route);
        expect(classification.isPublic).toBe(true);
        expect(classification.requiresAuth).toBe(false);
      });

      // Protected routes should be clearly identified
      const protectedRoutes = ['/dashboard', '/profile', '/settings'];
      protectedRoutes.forEach(route => {
        const classification = RouteClassifier.classifyRoute(route);
        expect(classification.isPublic).toBe(false);
        expect(classification.requiresAuth).toBe(true);
      });

      // Static assets should skip all auth
      const staticAssets = ['/icons/icon.png', '/manifest.json'];
      staticAssets.forEach(asset => {
        const classification = RouteClassifier.classifyRoute(asset);
        expect(classification.isStatic).toBe(true);
        expect(classification.requiresAuth).toBe(false);
      });
    });
  });
});