/**
 * Route Classification Utility
 * 
 * Provides classification logic for different types of routes:
 * - Static assets (images, PWA files, etc.)
 * - Public routes (accessible without authentication)
 * - Protected routes (require authentication)
 */

export interface StaticAssetPattern {
  pattern: RegExp;
  description: string;
}

export interface RouteClassification {
  isPublic: boolean;
  isStatic: boolean;
  requiresAuth: boolean;
  matchedPattern?: string;
}

export class RouteClassifier {
  private static readonly STATIC_ASSET_PATTERNS: StaticAssetPattern[] = [
    { pattern: /^\/icons\/.*/, description: 'PWA Icons' },
    { pattern: /^\/manifest\.json$/, description: 'PWA Manifest' },
    { pattern: /^\/favicon\..*/, description: 'Favicon' },
    { pattern: /^\/sw\.js$/, description: 'Service Worker' },
    { pattern: /^\/offline\.html$/, description: 'Offline Page' },
    { pattern: /^\/.*\.(png|jpg|jpeg|svg|ico|webp|gif|bmp)$/i, description: 'Images' },
    { pattern: /^\/.*\.(css|js|woff|woff2|ttf|eot)$/i, description: 'Static Assets' },
    { pattern: /^\/robots\.txt$/, description: 'Robots' },
    { pattern: /^\/sitemap\.xml$/, description: 'Sitemap' },
  ];

  private static readonly PUBLIC_ROUTES: string[] = [
    '/', '/landing', '/login', '/auth/callback', '/auth/exchange', 
    '/onboarding', '/reset-password', '/auth-status'
  ];

  /**
   * Classifies a route based on its pathname
   */
  static classifyRoute(pathname: string): RouteClassification {
    // Check if it's a static asset first
    const staticMatch = this.getStaticAssetMatch(pathname);
    if (staticMatch) {
      return {
        isPublic: true,
        isStatic: true,
        requiresAuth: false,
        matchedPattern: staticMatch.description
      };
    }

    // Check if it's a public route
    const isPublic = this.isPublicRoute(pathname);
    
    return {
      isPublic,
      isStatic: false,
      requiresAuth: !isPublic,
      matchedPattern: isPublic ? 'Public Route' : 'Protected Route'
    };
  }

  /**
   * Checks if a pathname matches any static asset pattern
   */
  static isStaticAsset(pathname: string): boolean {
    return this.STATIC_ASSET_PATTERNS.some(({ pattern }) => pattern.test(pathname));
  }

  /**
   * Gets the matching static asset pattern for a pathname
   */
  static getStaticAssetMatch(pathname: string): StaticAssetPattern | null {
    return this.STATIC_ASSET_PATTERNS.find(({ pattern }) => pattern.test(pathname)) || null;
  }

  /**
   * Checks if a pathname is in the public routes list
   */
  static isPublicRoute(pathname: string): boolean {
    return this.PUBLIC_ROUTES.includes(pathname);
  }

  /**
   * Checks if a pathname requires authentication
   */
  static requiresAuth(pathname: string): boolean {
    const classification = this.classifyRoute(pathname);
    return classification.requiresAuth;
  }

  /**
   * Gets all static asset patterns (for testing/debugging)
   */
  static getStaticAssetPatterns(): StaticAssetPattern[] {
    return [...this.STATIC_ASSET_PATTERNS];
  }

  /**
   * Gets all public routes (for testing/debugging)
   */
  static getPublicRoutes(): string[] {
    return [...this.PUBLIC_ROUTES];
  }
}