// src/lib/utils/performance.ts - Performance monitoring and optimization utilities
export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
}

export interface BundleInfo {
  size: number;
  gzipSize?: number;
  chunks: string[];
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring(): void {
    // Monitor navigation timing
    this.monitorNavigationTiming();
    
    // Monitor paint timing
    this.monitorPaintTiming();
    
    // Monitor layout shift
    this.monitorLayoutShift();
    
    // Monitor first input delay
    this.monitorFirstInputDelay();
    
    // Monitor largest contentful paint
    this.monitorLargestContentfulPaint();
  }

  private monitorNavigationTiming(): void {
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        this.metrics.loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        this.metrics.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
      }
    });
  }

  private monitorPaintTiming(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.firstContentfulPaint = entry.startTime;
          }
        }
      });
      
      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    }
  }

  private monitorLayoutShift(): void {
    if ('PerformanceObserver' in window) {
      let clsValue = 0;
      
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.metrics.cumulativeLayoutShift = clsValue;
      });
      
      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(observer);
    }
  }

  private monitorFirstInputDelay(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.metrics.firstInputDelay = (entry as any).processingStart - entry.startTime;
        }
      });
      
      observer.observe({ entryTypes: ['first-input'] });
      this.observers.push(observer);
    }
  }

  private monitorLargestContentfulPaint(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.largestContentfulPaint = lastEntry.startTime;
      });
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(observer);
    }
  }

  getMetrics(): PerformanceMetrics {
    return this.metrics as PerformanceMetrics;
  }

  logMetrics(): void {
    console.group('Performance Metrics');
    console.table(this.metrics);
    console.groupEnd();
  }

  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

/**
 * Measure component render time
 */
export function measureRenderTime(componentName: string) {
  return function <T extends any>(Component: T): T {
    // This would be implemented with React profiler in a real app
    console.log(`Performance measurement enabled for ${componentName}`);
    return Component;
  };
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): T {
  let timeout: NodeJS.Timeout | null = null;
  
  return ((...args: Parameters<T>) => {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  }) as T;
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean;
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}

/**
 * Memory usage monitoring
 */
export function getMemoryUsage(): any {
  if ('memory' in performance) {
    return (performance as any).memory;
  }
  return null;
}

/**
 * Bundle size analyzer
 */
export function analyzeBundleSize(): Promise<BundleInfo> {
  return new Promise((resolve) => {
    // This would typically integrate with webpack-bundle-analyzer
    // For now, return mock data
    resolve({
      size: 0,
      gzipSize: 0,
      chunks: []
    });
  });
}

/**
 * Critical resource hints
 */
export function addResourceHints(): void {
  if (typeof document === 'undefined') return;

  const head = document.head;
  
  // Preconnect to external domains
  const preconnectDomains = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ];
  
  preconnectDomains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    head.appendChild(link);
  });
  
  // DNS prefetch for external resources
  const dnsPrefetchDomains = [
    'https://api.supabase.co'
  ];
  
  dnsPrefetchDomains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    head.appendChild(link);
  });
}

/**
 * Optimize images for different screen sizes
 */
export function getOptimizedImageSrc(
  baseSrc: string,
  width: number,
  quality = 80
): string {
  // This would typically integrate with an image optimization service
  // For now, return the original src
  return baseSrc;
}

/**
 * Detect slow network conditions
 */
export function isSlowNetwork(): boolean {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return connection.effectiveType === 'slow-2g' || 
           connection.effectiveType === '2g' ||
           connection.saveData;
  }
  return false;
}

/**
 * Get network information for mobile optimization
 */
export function getNetworkInfo(): {
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
 * Mobile-specific performance optimizations
 */
export function optimizeForMobile(): void {
  if (typeof window === 'undefined') return;

  // Reduce animations on low-end devices
  const isLowEndDevice = navigator.hardwareConcurrency <= 2 || 
                        (navigator as any).deviceMemory <= 2;
  
  if (isLowEndDevice) {
    document.documentElement.style.setProperty('--animation-duration', '0.1s');
  }

  // Optimize for slow networks
  if (isSlowNetwork()) {
    // Disable non-critical animations
    document.documentElement.classList.add('reduce-motion');
    
    // Preload critical resources only
    const criticalResources = ['/manifest.json', '/favicon.svg'];
    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  }

  // Enable passive event listeners for better scroll performance
  const passiveEvents = ['touchstart', 'touchmove', 'wheel'];
  passiveEvents.forEach(event => {
    document.addEventListener(event, () => {}, { passive: true });
  });
}

/**
 * Monitor mobile-specific metrics
 */
export function monitorMobileMetrics(): void {
  if (typeof window === 'undefined') return;

  // Monitor touch interactions
  let touchStartTime = 0;
  document.addEventListener('touchstart', () => {
    touchStartTime = performance.now();
  }, { passive: true });

  document.addEventListener('touchend', () => {
    const touchDuration = performance.now() - touchStartTime;
    if (touchDuration > 100) {
      console.warn('Slow touch response:', touchDuration + 'ms');
    }
  }, { passive: true });

  // Monitor viewport changes (orientation, keyboard)
  let viewportHeight = window.innerHeight;
  window.addEventListener('resize', () => {
    const newHeight = window.innerHeight;
    const heightDiff = Math.abs(newHeight - viewportHeight);
    
    if (heightDiff > 150) {
      // Likely keyboard show/hide
      document.documentElement.style.setProperty('--vh', `${newHeight * 0.01}px`);
    }
    
    viewportHeight = newHeight;
  });

  // Monitor battery status for performance adjustments
  if ('getBattery' in navigator) {
    (navigator as any).getBattery().then((battery: any) => {
      const updateBatteryOptimizations = () => {
        if (battery.level < 0.2 || battery.charging === false) {
          // Enable power saving mode
          document.documentElement.classList.add('power-save');
        } else {
          document.documentElement.classList.remove('power-save');
        }
      };

      battery.addEventListener('levelchange', updateBatteryOptimizations);
      battery.addEventListener('chargingchange', updateBatteryOptimizations);
      updateBatteryOptimizations();
    });
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-initialize optimizations
if (typeof window !== 'undefined') {
  addResourceHints();
  optimizeForMobile();
  monitorMobileMetrics();
}