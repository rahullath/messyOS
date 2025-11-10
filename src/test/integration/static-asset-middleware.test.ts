import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouteClassifier } from '../../lib/utils/route-classifier';

// Test route classification directly
const testRouteClassification = (pathname: string) => {
  return RouteClassifier.classifyRoute(pathname);
};

describe('Static Asset Middleware Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PWA Asset Handling', () => {
    it('should classify manifest.json as static asset', () => {
      const classification = testRouteClassification('/manifest.json');
      
      expect(classification.isStatic).toBe(true);
      expect(classification.requiresAuth).toBe(false);
    });

    it('should classify service worker as static asset', () => {
      const classification = testRouteClassification('/sw.js');
      
      expect(classification.isStatic).toBe(true);
      expect(classification.requiresAuth).toBe(false);
    });

    it('should classify PWA icons as static assets', () => {
      const iconPaths = [
        '/icons/icon-72x72.png',
        '/icons/icon-96x96.png',
        '/icons/icon-128x128.png',
        '/icons/icon-144x144.png',
        '/icons/icon-152x152.png',
        '/icons/icon-192x192.png',
        '/icons/icon-384x384.png',
        '/icons/icon-512x512.png'
      ];

      for (const iconPath of iconPaths) {
        const classification = testRouteClassification(iconPath);
        
        expect(classification.isStatic).toBe(true);
        expect(classification.requiresAuth).toBe(false);
      }
    });

    it('should classify favicon files as static assets', () => {
      const faviconPaths = [
        '/favicon.svg',
        '/favicon.ico',
        '/favicon.png'
      ];

      for (const faviconPath of faviconPaths) {
        const classification = testRouteClassification(faviconPath);
        
        expect(classification.isStatic).toBe(true);
        expect(classification.requiresAuth).toBe(false);
      }
    });
  });

  describe('SEO and Meta File Handling', () => {
    it('should classify robots.txt as static asset', () => {
      const classification = testRouteClassification('/robots.txt');
      
      expect(classification.isStatic).toBe(true);
      expect(classification.requiresAuth).toBe(false);
    });

    it('should classify sitemap.xml as static asset', () => {
      const classification = testRouteClassification('/sitemap.xml');
      
      expect(classification.isStatic).toBe(true);
      expect(classification.requiresAuth).toBe(false);
    });
  });

  describe('Image Asset Handling', () => {
    it('should classify various image formats as static assets', () => {
      const imagePaths = [
        '/logo.png',
        '/hero-image.jpg',
        '/background.jpeg',
        '/icon.svg',
        '/screenshot.webp',
        '/favicon.ico'
      ];

      for (const imagePath of imagePaths) {
        const classification = testRouteClassification(imagePath);
        
        expect(classification.isStatic).toBe(true);
        expect(classification.requiresAuth).toBe(false);
      }
    });
  });

  describe('Public Route Handling', () => {
    it('should classify landing page as public route', () => {
      const classification = testRouteClassification('/');
      
      expect(classification.isPublic).toBe(true);
      expect(classification.isStatic).toBe(false);
    });

    it('should classify login page as public route', () => {
      const classification = testRouteClassification('/login');
      
      expect(classification.isPublic).toBe(true);
      expect(classification.requiresAuth).toBe(false);
    });

    it('should classify reset password page as public route', () => {
      const classification = testRouteClassification('/reset-password');
      
      expect(classification.isPublic).toBe(true);
      expect(classification.requiresAuth).toBe(false);
    });

    it('should classify auth callback as public route', () => {
      const classification = testRouteClassification('/auth/callback');
      
      expect(classification.isPublic).toBe(true);
      expect(classification.requiresAuth).toBe(false);
    });
  });

  describe('Performance and Classification', () => {
    it('should quickly classify static assets', () => {
      const startTime = performance.now();
      
      const classification = testRouteClassification('/icons/icon-192x192.png');
      
      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Route classification should be very fast (< 1ms)
      expect(processingTime).toBeLessThan(1);
      expect(classification.isStatic).toBe(true);
    });

    it('should provide correct classification details', () => {
      const classification = testRouteClassification('/manifest.json');
      
      expect(classification.isStatic).toBe(true);
      expect(classification.isPublic).toBe(true); // Static assets are also considered public
      expect(classification.requiresAuth).toBe(false);
      expect(classification.matchedPattern).toBeDefined();
    });
  });

  describe('Edge Cases and Security', () => {
    it('should handle malformed static asset paths safely', () => {
      const malformedPaths = [
        '/icons/../../../etc/passwd',
        '/manifest.json?redirect=evil.com',
        '/sw.js#malicious',
        '/favicon.svg%00.php'
      ];

      for (const malformedPath of malformedPaths) {
        // Should not throw errors
        expect(() => testRouteClassification(malformedPath)).not.toThrow();
      }
    });

    it('should classify routes based on file extension patterns', () => {
      const testCases = [
        { path: '/dashboard/icons/fake.png', expectedStatic: true }, // .png extension matches
        { path: '/admin/manifest.json', expectedStatic: false }, // .json not in static patterns (only specific manifest.json)
        { path: '/api/sw.js', expectedStatic: true }, // .js extension matches static assets pattern
        { path: '/protected/favicon.svg', expectedStatic: true } // .svg extension matches
      ];

      for (const testCase of testCases) {
        const classification = testRouteClassification(testCase.path);
        
        expect(classification.isStatic).toBe(testCase.expectedStatic);
      }
    });
  });

  describe('Content Type Validation', () => {
    it('should properly classify routes by content type patterns', () => {
      const testCases = [
        { path: '/manifest.json', expectedStatic: true }, // Specific manifest pattern
        { path: '/api/manifest.json', expectedStatic: false }, // Not root manifest.json and .json not in static patterns
        { path: '/icons/icon.png', expectedStatic: true }, // Icons pattern + .png extension
        { path: '/dashboard/icons/icon.png', expectedStatic: true }, // .png extension matches
        { path: '/sw.js', expectedStatic: true }, // Specific sw.js pattern
        { path: '/api/sw.js', expectedStatic: true } // .js extension matches static assets pattern
      ];

      for (const testCase of testCases) {
        const classification = testRouteClassification(testCase.path);
        
        expect(classification.isStatic).toBe(testCase.expectedStatic);
      }
    });
  });
});