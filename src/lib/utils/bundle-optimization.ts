// src/lib/utils/bundle-optimization.ts - Bundle size optimization utilities
import React from 'react';
import { analytics } from '../analytics/tracking';

/**
 * Dynamic import wrapper with error handling and analytics
 */
export async function dynamicImport<T>(
  importFn: () => Promise<T>,
  componentName: string,
  fallback?: T
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const module = await importFn();
    const loadTime = Date.now() - startTime;
    
    // Track successful dynamic import
    analytics.trackPerformance('dynamic_import_success', loadTime, {
      component: componentName
    });
    
    return module;
  } catch (error) {
    const loadTime = Date.now() - startTime;
    
    // Track failed dynamic import
    analytics.trackError(error instanceof Error ? error : new Error(String(error)), {
      context: 'dynamic_import',
      component: componentName,
      loadTime
    });
    
    if (fallback) {
      return fallback;
    }
    
    throw error;
  }
}

/**
 * Lazy load component with loading state
 */
export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    return dynamicImport(importFn, componentName);
  });
}

/**
 * Preload critical components
 */
export function preloadCriticalComponents(): void {
  // Preload authentication components
  const authComponents = [
    () => import('../../components/auth/AuthForm'),
    () => import('../../components/auth/EmailPasswordForm'),
    () => import('../../components/auth/OAuthButtons')
  ];

  authComponents.forEach((importFn, index) => {
    // Preload with a small delay to avoid blocking initial render
    setTimeout(() => {
      importFn().catch(error => {
        console.warn(`Failed to preload auth component ${index}:`, error);
      });
    }, 100 * index);
  });

  // Preload wallet components for authenticated users
  if (localStorage.getItem('supabase.auth.token')) {
    setTimeout(() => {
      import('../../components/wallet/Wallet').catch(error => {
        console.warn('Failed to preload wallet component:', error);
      });
    }, 500);
  }
}

/**
 * Code splitting by route
 */
export const routeComponents = {
  landing: () => dynamicImport(
    () => import('../../components/landing/LandingPage'),
    'LandingPage'
  ),
  auth: () => dynamicImport(
    () => import('../../components/auth/AuthForm'),
    'AuthForm'
  ),
  dashboard: () => dynamicImport(
    () => import('../../pages/dashboard'),
    'Dashboard'
  ),
  wallet: () => dynamicImport(
    () => import('../../components/wallet/Wallet'),
    'Wallet'
  ),
  onboarding: () => dynamicImport(
    () => import('../../components/onboarding/ProfileForm'),
    'OnboardingForm'
  )
};

/**
 * Optimize images for different screen sizes
 */
export function getOptimizedImageProps(
  src: string,
  alt: string,
  sizes?: string
): {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  loading: 'lazy' | 'eager';
  decoding: 'async';
} {
  // Generate responsive image sources
  const baseName = src.split('.').slice(0, -1).join('.');
  const extension = src.split('.').pop();
  
  const srcSet = [
    `${baseName}-320w.${extension} 320w`,
    `${baseName}-640w.${extension} 640w`,
    `${baseName}-1024w.${extension} 1024w`,
    `${baseName}-1280w.${extension} 1280w`
  ].join(', ');

  return {
    src,
    srcSet,
    sizes: sizes || '(max-width: 640px) 320px, (max-width: 1024px) 640px, 1024px',
    alt,
    loading: 'lazy',
    decoding: 'async'
  };
}

/**
 * Critical CSS inlining
 */
export function inlineCriticalCSS(): void {
  if (typeof document === 'undefined') return;

  const criticalCSS = `
    /* Critical CSS for above-the-fold content */
    .loading-spinner {
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    .fade-in {
      animation: fadeIn 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    /* Prevent layout shift */
    .aspect-ratio-16-9 {
      aspect-ratio: 16 / 9;
    }
    
    .aspect-ratio-1-1 {
      aspect-ratio: 1 / 1;
    }
  `;

  const style = document.createElement('style');
  style.textContent = criticalCSS;
  document.head.appendChild(style);
}

/**
 * Resource hints for better performance
 */
export function addResourceHints(): void {
  if (typeof document === 'undefined') return;

  const hints = [
    // Preconnect to external domains
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
    
    // DNS prefetch for API endpoints
    { rel: 'dns-prefetch', href: 'https://api.supabase.co' },
    
    // Preload critical fonts
    { 
      rel: 'preload', 
      href: '/fonts/inter-var.woff2', 
      as: 'font', 
      type: 'font/woff2',
      crossOrigin: 'anonymous'
    },
    
    // Preload critical images
    { rel: 'preload', href: '/favicon.svg', as: 'image' },
    { rel: 'preload', href: '/icons/icon-192x192.png', as: 'image' }
  ];

  hints.forEach(hint => {
    const link = document.createElement('link');
    Object.entries(hint).forEach(([key, value]) => {
      if (key === 'crossOrigin') {
        link.crossOrigin = value as string;
      } else {
        link.setAttribute(key, value as string);
      }
    });
    document.head.appendChild(link);
  });
}

/**
 * Service worker registration for caching
 */
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      analytics.trackEngagement('service_worker', 'registered');
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content available
              analytics.trackEngagement('service_worker', 'update_available');
            }
          });
        }
      });
      
    } catch (error) {
      analytics.trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'service_worker_registration'
      });
    }
  }
}

/**
 * Monitor and optimize bundle size with detailed analysis
 */
export function monitorBundleSize(): void {
  if (typeof window === 'undefined') return;

  let totalJSSize = 0;
  let totalCSSSize = 0;
  const bundleMetrics = {
    chunks: [] as Array<{name: string, size: number, loadTime: number}>,
    totalSize: 0,
    compressionRatio: 0
  };

  // Monitor resource loading
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const resource = entry as PerformanceResourceTiming;
      const size = resource.transferSize || 0;
      const loadTime = resource.duration;
      
      if (resource.name.includes('.js')) {
        totalJSSize += size;
        bundleMetrics.chunks.push({
          name: resource.name.split('/').pop() || resource.name,
          size,
          loadTime
        });
        
        // Track large bundles with more context
        if (size > 100000) { // 100KB
          analytics.trackPerformance('large_bundle_detected', size, {
            url: resource.name,
            loadTime,
            gzipRatio: resource.encodedBodySize ? resource.transferSize / resource.encodedBodySize : 1,
            isMainBundle: resource.name.includes('main') || resource.name.includes('index'),
            isVendor: resource.name.includes('vendor') || resource.name.includes('node_modules')
          });
        }
        
        // Track slow loading bundles with network context
        if (loadTime > 1000) { // 1 second
          const networkInfo = getNetworkInfo();
          analytics.trackPerformance('slow_bundle_load', loadTime, {
            url: resource.name,
            size,
            networkType: networkInfo?.effectiveType || 'unknown',
            isSlowNetwork: networkInfo?.effectiveType === 'slow-2g' || networkInfo?.effectiveType === '2g'
          });
        }
      } else if (resource.name.includes('.css')) {
        totalCSSSize += size;
      }
    }
    
    // Update bundle metrics
    bundleMetrics.totalSize = totalJSSize + totalCSSSize;
    bundleMetrics.compressionRatio = bundleMetrics.chunks.reduce((acc, chunk) => {
      return acc + (chunk.size > 0 ? 1 : 0);
    }, 0) / bundleMetrics.chunks.length;
    
    // Track overall bundle performance
    if (bundleMetrics.totalSize > 500000) { // 500KB total
      analytics.trackPerformance('large_total_bundle', bundleMetrics.totalSize, {
        jsSize: totalJSSize,
        cssSize: totalCSSSize,
        chunkCount: bundleMetrics.chunks.length,
        avgCompressionRatio: bundleMetrics.compressionRatio
      });
    }
  });
  
  observer.observe({ entryTypes: ['resource'] });

  // Report bundle summary after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      analytics.trackPerformance('bundle_summary', bundleMetrics.totalSize, {
        jsSize: totalJSSize,
        cssSize: totalCSSSize,
        chunkCount: bundleMetrics.chunks.length,
        largestChunk: Math.max(...bundleMetrics.chunks.map(c => c.size)),
        slowestChunk: Math.max(...bundleMetrics.chunks.map(c => c.loadTime))
      });
    }, 2000);
  });
}

/**
 * Get network-aware optimization recommendations
 */
function getNetworkInfo(): {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
} | null {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false
    };
  }
  return null;
}

/**
 * Tree shaking helper - mark unused exports
 */
export function markUnusedExports(): void {
  // This would typically be handled by build tools
  // But we can track which features are actually used
  const usedFeatures = new Set<string>();
  
  return {
    markUsed: (feature: string) => {
      usedFeatures.add(feature);
      analytics.trackFeatureUsage('bundle_optimization', 'feature_used', { feature });
    },
    getUnusedFeatures: () => {
      // Return list of features that could be tree-shaken
      const allFeatures = ['auth', 'wallet', 'dashboard', 'analytics', 'onboarding'];
      return allFeatures.filter(feature => !usedFeatures.has(feature));
    }
  };
}

// Auto-initialize optimizations
if (typeof window !== 'undefined') {
  // Add resource hints immediately
  addResourceHints();
  
  // Inline critical CSS
  inlineCriticalCSS();
  
  // Register service worker after page load
  window.addEventListener('load', () => {
    registerServiceWorker();
    preloadCriticalComponents();
    monitorBundleSize();
  });
}