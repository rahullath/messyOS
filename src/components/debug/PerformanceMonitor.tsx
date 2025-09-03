// src/components/debug/PerformanceMonitor.tsx - Performance monitoring dashboard
import React, { useState, useEffect } from 'react';
import { performanceMonitor, type PerformanceMetrics, analyzeBundleSize, getMemoryUsage, getNetworkInfo } from '../../lib/utils/performance';
import { analytics } from '../../lib/analytics/tracking';

interface PerformanceData {
  metrics: PerformanceMetrics;
  bundleSize: number;
  memoryUsage: any;
  networkInfo: any;
  analyticsEvents: number;
}

export function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadPerformanceData = async () => {
    setIsLoading(true);
    try {
      const [bundleInfo] = await Promise.all([
        analyzeBundleSize()
      ]);

      const newData: PerformanceData = {
        metrics: performanceMonitor.getMetrics(),
        bundleSize: bundleInfo.size,
        memoryUsage: getMemoryUsage(),
        networkInfo: getNetworkInfo(),
        analyticsEvents: analytics.getSummary().eventsQueued
      };

      setData(newData);
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      loadPerformanceData();
      const interval = setInterval(loadPerformanceData, 5000);
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  // Only show in development or when explicitly enabled
  const shouldShow = process.env.NODE_ENV === 'development' || 
                    localStorage.getItem('debug-performance') === 'true';

  if (!shouldShow) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatMs = (ms: number) => {
    return ms ? `${Math.round(ms)}ms` : 'N/A';
  };

  const getPerformanceScore = (metrics: PerformanceMetrics) => {
    let score = 100;
    
    // Deduct points for slow metrics
    if (metrics.firstContentfulPaint && metrics.firstContentfulPaint > 2000) score -= 20;
    if (metrics.largestContentfulPaint && metrics.largestContentfulPaint > 4000) score -= 20;
    if (metrics.firstInputDelay && metrics.firstInputDelay > 100) score -= 20;
    if (metrics.cumulativeLayoutShift && metrics.cumulativeLayoutShift > 0.1) score -= 20;
    if (metrics.loadTime > 3000) score -= 20;
    
    return Math.max(0, score);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 right-4 z-50 bg-slate-800 border border-slate-600 text-white p-2 rounded-lg shadow-lg hover:bg-slate-700 transition-colors"
        title="Performance Monitor"
      >
        📊
      </button>

      {/* Performance Panel */}
      {isVisible && (
        <div className="fixed bottom-16 right-4 z-50 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg shadow-xl w-80 max-h-96 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Performance Monitor</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-cyan-400 rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-400">Loading metrics...</p>
              </div>
            ) : data ? (
              <div className="space-y-4">
                {/* Performance Score */}
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Performance Score</span>
                    <span className={`text-lg font-bold ${getScoreColor(getPerformanceScore(data.metrics))}`}>
                      {getPerformanceScore(data.metrics)}
                    </span>
                  </div>
                </div>

                {/* Core Web Vitals */}
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-white mb-2">Core Web Vitals</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-300">FCP</span>
                      <span className="text-cyan-400">{formatMs(data.metrics.firstContentfulPaint || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">LCP</span>
                      <span className="text-cyan-400">{formatMs(data.metrics.largestContentfulPaint || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">FID</span>
                      <span className="text-cyan-400">{formatMs(data.metrics.firstInputDelay || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">CLS</span>
                      <span className="text-cyan-400">{(data.metrics.cumulativeLayoutShift || 0).toFixed(3)}</span>
                    </div>
                  </div>
                </div>

                {/* Bundle Size */}
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-white mb-2">Bundle Size</h4>
                  <div className="text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Size</span>
                      <span className="text-cyan-400">{formatBytes(data.bundleSize)}</span>
                    </div>
                  </div>
                </div>

                {/* Memory Usage */}
                {data.memoryUsage && (
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-white mb-2">Memory Usage</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Used</span>
                        <span className="text-cyan-400">{formatBytes(data.memoryUsage.usedJSHeapSize)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Total</span>
                        <span className="text-cyan-400">{formatBytes(data.memoryUsage.totalJSHeapSize)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Limit</span>
                        <span className="text-cyan-400">{formatBytes(data.memoryUsage.jsHeapSizeLimit)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Network Info */}
                {data.networkInfo && (
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-white mb-2">Network</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-300">Type</span>
                        <span className="text-cyan-400">{data.networkInfo.effectiveType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">Downlink</span>
                        <span className="text-cyan-400">{data.networkInfo.downlink} Mbps</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-300">RTT</span>
                        <span className="text-cyan-400">{data.networkInfo.rtt}ms</span>
                      </div>
                      {data.networkInfo.saveData && (
                        <div className="text-yellow-400 text-xs">Data Saver: ON</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Analytics */}
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-white mb-2">Analytics</h4>
                  <div className="text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Queued Events</span>
                      <span className="text-cyan-400">{data.analyticsEvents}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={loadPerformanceData}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs py-2 px-3 rounded transition-colors"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={() => performanceMonitor.logMetrics()}
                    className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-xs py-2 px-3 rounded transition-colors"
                  >
                    Log to Console
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">No data available</p>
                <button
                  onClick={loadPerformanceData}
                  className="mt-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs py-2 px-3 rounded transition-colors"
                >
                  Load Data
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// Hook to enable performance monitoring
export function usePerformanceMonitoring() {
  useEffect(() => {
    // Enable performance monitoring in development
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('debug-performance', 'true');
    }

    // Track page performance
    const trackPagePerformance = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        analytics.trackPageLoadTime(
          window.location.pathname,
          navigation.loadEventEnd - navigation.loadEventStart
        );
      }
    };

    // Track performance after page load
    if (document.readyState === 'complete') {
      trackPagePerformance();
    } else {
      window.addEventListener('load', trackPagePerformance);
    }

    return () => {
      window.removeEventListener('load', trackPagePerformance);
    };
  }, []);
}