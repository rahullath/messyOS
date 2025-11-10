// src/lib/utils/lazy-loading.ts - Lazy loading utilities for performance optimization
import React, { lazy, ComponentType } from 'react';

/**
 * Enhanced lazy loading with error boundary and loading states
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
): T {
  const LazyComponent = lazy(importFn);
  
  return LazyComponent as T;
}

/**
 * Preload a lazy component
 */
export function preloadComponent(importFn: () => Promise<any>): void {
  // Start loading the component but don't wait for it
  importFn().catch(console.error);
}

/**
 * Intersection Observer for lazy loading elements
 */
export class LazyLoader {
  private observer: IntersectionObserver | null = null;
  private loadedElements = new Set<Element>();

  constructor(
    private callback: (element: Element) => void,
    private options: IntersectionObserverInit = {
      rootMargin: '50px',
      threshold: 0.1
    }
  ) {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(this.handleIntersection.bind(this), options);
    }
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      if (entry.isIntersecting && !this.loadedElements.has(entry.target)) {
        this.loadedElements.add(entry.target);
        this.callback(entry.target);
        this.observer?.unobserve(entry.target);
      }
    });
  }

  observe(element: Element): void {
    if (this.observer && !this.loadedElements.has(element)) {
      this.observer.observe(element);
    } else {
      // Fallback for browsers without IntersectionObserver
      this.callback(element);
    }
  }

  unobserve(element: Element): void {
    this.observer?.unobserve(element);
  }

  disconnect(): void {
    this.observer?.disconnect();
    this.loadedElements.clear();
  }
}

/**
 * Hook for lazy loading images
 */
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (!imgRef.current) return;

    const loader = new LazyLoader((element) => {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      img.onerror = () => {
        setIsError(true);
      };
      img.src = src;
    });

    loader.observe(imgRef.current);

    return () => loader.disconnect();
  }, [src]);

  return { imageSrc, isLoaded, isError, imgRef };
}

/**
 * Dynamic import with retry logic
 */
export async function dynamicImport<T>(
  importFn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await importFn();
    } catch (error) {
      if (i === retries - 1) throw error;
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  
  throw new Error('Dynamic import failed after retries');
}

/**
 * Code splitting utility for route-based splitting
 */
export const LazyRoutes = {
  Dashboard: createLazyComponent(() => dynamicImport(() => import('../../pages/dashboard'))),
  Wallet: createLazyComponent(() => dynamicImport(() => import('../../components/wallet/Wallet'))),
  Profile: createLazyComponent(() => dynamicImport(() => import('../../components/profile/Profile'))),
  Settings: createLazyComponent(() => dynamicImport(() => import('../../components/settings/Settings'))),
  AuthForm: createLazyComponent(() => dynamicImport(() => import('../../components/auth/AuthForm'))),
  LandingPage: createLazyComponent(() => dynamicImport(() => import('../../components/landing/LandingPage')))
};

/**
 * Preload critical routes
 */
export function preloadCriticalRoutes(): void {
  if (typeof window === 'undefined') return;

  // Preload dashboard after a short delay
  setTimeout(() => {
    preloadComponent(() => import('../../components/wallet/Wallet'));
  }, 2000);

  // Preload wallet on user interaction
  const preloadWallet = () => {
    preloadComponent(() => import('../../components/wallet/Wallet'));
    document.removeEventListener('mouseover', preloadWallet, { once: true });
    document.removeEventListener('touchstart', preloadWallet, { once: true });
  };

  document.addEventListener('mouseover', preloadWallet, { once: true });
  document.addEventListener('touchstart', preloadWallet, { once: true });
}

// Auto-preload on import
if (typeof window !== 'undefined') {
  // Preload after page load
  if (document.readyState === 'complete') {
    preloadCriticalRoutes();
  } else {
    window.addEventListener('load', preloadCriticalRoutes);
  }
}