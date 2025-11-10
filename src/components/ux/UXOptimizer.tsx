// src/components/ux/UXOptimizer.tsx - Comprehensive UX optimization component
import React, { useEffect, useState } from 'react';
import { analytics } from '../../lib/analytics/tracking';
import { performanceMonitor, isSlowNetwork, getNetworkInfo } from '../../lib/utils/performance';
import { LoadingState } from '../ui/LoadingStates';
import { Toast } from '../ui/SuccessAnimations';

interface UXOptimizationSettings {
  enableAnimations: boolean;
  enableHapticFeedback: boolean;
  enableSoundFeedback: boolean;
  reduceMotion: boolean;
  enableDataSaver: boolean;
  enableOfflineMode: boolean;
  preferredTheme: 'auto' | 'light' | 'dark';
  enableAccessibilityFeatures: boolean;
}

interface NetworkOptimization {
  preloadCriticalResources: boolean;
  enableImageOptimization: boolean;
  enableLazyLoading: boolean;
  enableServiceWorker: boolean;
  compressionLevel: 'low' | 'medium' | 'high';
}

interface PerformanceOptimization {
  enableBundleSplitting: boolean;
  enableTreeShaking: boolean;
  enableCodeMinification: boolean;
  enableGzipCompression: boolean;
  enableCaching: boolean;
}

export function UXOptimizer() {
  const [settings, setSettings] = useState<UXOptimizationSettings>({
    enableAnimations: true,
    enableHapticFeedback: true,
    enableSoundFeedback: false,
    reduceMotion: false,
    enableDataSaver: false,
    enableOfflineMode: true,
    preferredTheme: 'auto',
    enableAccessibilityFeatures: true
  });

  const [networkOptimization, setNetworkOptimization] = useState<NetworkOptimization>({
    preloadCriticalResources: true,
    enableImageOptimization: true,
    enableLazyLoading: true,
    enableServiceWorker: true,
    compressionLevel: 'medium'
  });

  const [performanceOptimization, setPerformanceOptimization] = useState<PerformanceOptimization>({
    enableBundleSplitting: true,
    enableTreeShaking: true,
    enableCodeMinification: true,
    enableGzipCompression: true,
    enableCaching: true
  });

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<string[]>([]);

  // Auto-detect and apply optimizations based on device capabilities
  useEffect(() => {
    detectAndOptimize();
  }, []);

  const detectAndOptimize = async () => {
    setIsOptimizing(true);
    const results: string[] = [];

    try {
      // Detect device capabilities
      const deviceCapabilities = await detectDeviceCapabilities();
      results.push(`Device capabilities detected: ${deviceCapabilities.type}`);

      // Detect network conditions
      const networkInfo = getNetworkInfo();
      const slowNetwork = isSlowNetwork();
      
      if (slowNetwork || networkInfo?.saveData) {
        // Optimize for slow network
        await optimizeForSlowNetwork();
        results.push('Optimized for slow network connection');
      }

      // Detect accessibility preferences
      const accessibilityPrefs = detectAccessibilityPreferences();
      if (accessibilityPrefs.reduceMotion) {
        setSettings(prev => ({ ...prev, reduceMotion: true, enableAnimations: false }));
        results.push('Reduced motion enabled for accessibility');
      }

      // Optimize based on device memory
      if (deviceCapabilities.memory && deviceCapabilities.memory < 4) {
        await optimizeForLowMemory();
        results.push('Optimized for low memory device');
      }

      // Optimize based on CPU cores
      if (deviceCapabilities.cores && deviceCapabilities.cores <= 2) {
        await optimizeForLowEndDevice();
        results.push('Optimized for low-end device');
      }

      // Apply theme based on system preference
      const preferredTheme = (typeof window !== 'undefined' && window.matchMedia && 
                             window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
      setSettings(prev => ({ ...prev, preferredTheme }));
      results.push(`Applied ${preferredTheme} theme`);

      // Track optimization results
      analytics.track('ux_optimization_complete', {
        category: 'ux',
        action: 'auto_optimization',
        optimizations: results.length,
        deviceType: deviceCapabilities.type,
        networkType: networkInfo?.effectiveType || 'unknown'
      });

    } catch (error) {
      console.error('UX optimization failed:', error);
      results.push('Optimization failed - using default settings');
    } finally {
      setOptimizationResults(results);
      setIsOptimizing(false);
    }
  };

  const detectDeviceCapabilities = async (): Promise<{
    type: 'high-end' | 'mid-range' | 'low-end';
    memory?: number;
    cores?: number;
    gpu?: string;
  }> => {
    const memory = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    
    // Simple device classification
    let type: 'high-end' | 'mid-range' | 'low-end' = 'mid-range';
    
    if (memory >= 8 && cores >= 8) {
      type = 'high-end';
    } else if (memory <= 2 || cores <= 2) {
      type = 'low-end';
    }

    return { type, memory, cores };
  };

  const detectAccessibilityPreferences = () => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return { reduceMotion: false, highContrast: false, largeText: false };
    }
    
    return {
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      highContrast: window.matchMedia('(prefers-contrast: high)').matches,
      largeText: window.matchMedia('(prefers-reduced-data: reduce)').matches
    };
  };

  const optimizeForSlowNetwork = async () => {
    // Enable data saver mode
    setSettings(prev => ({ ...prev, enableDataSaver: true }));
    setNetworkOptimization(prev => ({
      ...prev,
      compressionLevel: 'high',
      enableImageOptimization: true,
      enableLazyLoading: true
    }));

    // Disable non-essential animations
    setSettings(prev => ({ ...prev, enableAnimations: false }));

    // Preload only critical resources
    document.documentElement.classList.add('data-saver-mode');
  };

  const optimizeForLowMemory = async () => {
    // Reduce bundle size and enable aggressive caching
    setPerformanceOptimization(prev => ({
      ...prev,
      enableBundleSplitting: true,
      enableTreeShaking: true,
      enableCaching: true
    }));

    // Disable memory-intensive features
    setSettings(prev => ({ 
      ...prev, 
      enableAnimations: false,
      enableSoundFeedback: false 
    }));

    document.documentElement.classList.add('low-memory-mode');
  };

  const optimizeForLowEndDevice = async () => {
    // Reduce CPU-intensive operations
    setSettings(prev => ({
      ...prev,
      enableAnimations: false,
      reduceMotion: true
    }));

    // Enable performance optimizations
    setPerformanceOptimization(prev => ({
      ...prev,
      enableCodeMinification: true,
      enableGzipCompression: true
    }));

    document.documentElement.classList.add('low-end-device');
  };

  // Apply optimizations to the DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply animation settings
    if (settings.reduceMotion || !settings.enableAnimations) {
      root.style.setProperty('--animation-duration', '0.01ms');
      root.classList.add('reduce-motion');
    } else {
      root.style.removeProperty('--animation-duration');
      root.classList.remove('reduce-motion');
    }

    // Apply theme
    if (settings.preferredTheme !== 'auto') {
      root.setAttribute('data-theme', settings.preferredTheme);
    }

    // Apply accessibility features
    if (settings.enableAccessibilityFeatures) {
      root.classList.add('accessibility-enhanced');
    }

  }, [settings]);

  // Monitor and report performance improvements
  useEffect(() => {
    const reportPerformanceImprovement = () => {
      const metrics = performanceMonitor.getMetrics();
      
      analytics.track('performance_improvement', {
        category: 'performance',
        action: 'optimization_impact',
        loadTime: metrics.loadTime,
        fcp: metrics.firstContentfulPaint,
        lcp: metrics.largestContentfulPaint,
        optimizationsApplied: optimizationResults.length
      });
    };

    // Report after optimizations are applied
    if (optimizationResults.length > 0) {
      setTimeout(reportPerformanceImprovement, 2000);
    }
  }, [optimizationResults]);

  // Provide optimization recommendations
  const getOptimizationRecommendations = (): string[] => {
    const recommendations: string[] = [];
    const networkInfo = getNetworkInfo();
    
    if (networkInfo?.saveData) {
      recommendations.push('Enable data saver mode for better performance');
    }
    
    if (isSlowNetwork()) {
      recommendations.push('Reduce image quality and disable animations');
    }
    
    const memory = (navigator as any).deviceMemory;
    if (memory && memory < 4) {
      recommendations.push('Enable memory optimization mode');
    }
    
    if (navigator.hardwareConcurrency <= 2) {
      recommendations.push('Reduce CPU-intensive operations');
    }
    
    return recommendations;
  };

  // Only show in development or when explicitly enabled
  const shouldShow = process.env.NODE_ENV === 'development' || 
                    localStorage.getItem('debug-ux-optimizer') === 'true';

  if (!shouldShow) {
    // Still apply optimizations silently in production
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {/* Optimization Status */}
      {isOptimizing && (
        <div className="bg-slate-800/90 border border-slate-600 rounded-lg p-4 mb-2 shadow-xl">
          <div className="flex items-center space-x-3">
            <LoadingState type="spinner" size="sm" />
            <span className="text-sm text-white">Optimizing UX...</span>
          </div>
        </div>
      )}

      {/* Optimization Results */}
      {optimizationResults.length > 0 && (
        <div className="bg-slate-800/90 border border-slate-600 rounded-lg p-4 shadow-xl max-w-sm">
          <h4 className="text-sm font-medium text-white mb-2">UX Optimizations Applied</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {optimizationResults.map((result, index) => (
              <div key={index} className="text-xs text-green-400 flex items-center space-x-1">
                <span>✓</span>
                <span>{result}</span>
              </div>
            ))}
          </div>
          
          {/* Recommendations */}
          {getOptimizationRecommendations().length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-600">
              <h5 className="text-xs font-medium text-yellow-400 mb-1">Recommendations</h5>
              {getOptimizationRecommendations().map((rec, index) => (
                <div key={index} className="text-xs text-yellow-300">
                  • {rec}
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={() => setOptimizationResults([])}
            className="mt-3 w-full bg-slate-600 hover:bg-slate-500 text-white text-xs py-2 rounded transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// Hook for using UX optimization in components
export function useUXOptimization() {
  const [isOptimized, setIsOptimized] = useState(false);
  const [optimizationLevel, setOptimizationLevel] = useState<'none' | 'basic' | 'aggressive'>('none');

  useEffect(() => {
    // Auto-detect optimization needs
    const detectOptimizationNeeds = () => {
      const networkInfo = getNetworkInfo();
      const slowNetwork = isSlowNetwork();
      const lowMemory = (navigator as any).deviceMemory < 4;
      const lowEndDevice = navigator.hardwareConcurrency <= 2;

      if (slowNetwork || networkInfo?.saveData || lowMemory || lowEndDevice) {
        setOptimizationLevel('aggressive');
      } else if (networkInfo?.effectiveType === '3g') {
        setOptimizationLevel('basic');
      } else {
        setOptimizationLevel('none');
      }

      setIsOptimized(true);
    };

    detectOptimizationNeeds();
  }, []);

  const shouldReduceAnimations = optimizationLevel === 'aggressive' || 
                                (typeof window !== 'undefined' && window.matchMedia && 
                                 window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const shouldOptimizeImages = optimizationLevel !== 'none';

  const shouldLazyLoad = optimizationLevel !== 'none';

  return {
    isOptimized,
    optimizationLevel,
    shouldReduceAnimations,
    shouldOptimizeImages,
    shouldLazyLoad,
    isSlowNetwork: isSlowNetwork(),
    networkInfo: getNetworkInfo()
  };
}

// CSS for UX optimizations
const uxOptimizationStyles = `
  /* Data saver mode */
  .data-saver-mode * {
    animation-duration: 0.1s !important;
    transition-duration: 0.1s !important;
  }
  
  .data-saver-mode img {
    filter: contrast(0.8) brightness(0.9);
  }

  /* Low memory mode */
  .low-memory-mode .shimmer,
  .low-memory-mode .animate-pulse {
    animation: none !important;
  }

  /* Low-end device mode */
  .low-end-device * {
    will-change: auto !important;
    transform: none !important;
  }
  
  .low-end-device .backdrop-blur-sm {
    backdrop-filter: none !important;
    background-color: rgba(15, 23, 42, 0.9) !important;
  }

  /* Accessibility enhancements */
  .accessibility-enhanced :focus {
    outline: 3px solid #06b6d4 !important;
    outline-offset: 2px !important;
  }
  
  .accessibility-enhanced button:focus,
  .accessibility-enhanced a:focus {
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.5) !important;
  }

  /* Reduced motion */
  .reduce-motion *,
  .reduce-motion *::before,
  .reduce-motion *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* High contrast mode */
  @media (prefers-contrast: high) {
    .accessibility-enhanced {
      --tw-border-opacity: 1 !important;
      border-color: rgb(255 255 255 / var(--tw-border-opacity)) !important;
    }
  }

  /* Print optimizations */
  @media print {
    .ux-optimizer,
    .performance-monitor,
    .analytics-dashboard {
      display: none !important;
    }
  }
`;

// Inject UX optimization styles
if (typeof document !== 'undefined') {
  const styleId = 'ux-optimization-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = uxOptimizationStyles;
    document.head.appendChild(style);
  }
}