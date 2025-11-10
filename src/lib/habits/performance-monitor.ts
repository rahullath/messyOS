// src/lib/habits/performance-monitor.ts - Performance monitoring for habits module
import type { Database } from '../../types/supabase';

interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

interface QueryPerformance {
  queryType: string;
  executionTime: number;
  resultCount?: number;
  cacheHit?: boolean;
  parameters?: Record<string, any>;
}

interface ComponentPerformance {
  componentName: string;
  renderTime: number;
  dataSize?: number;
  reRenderCount?: number;
}

class HabitPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000;
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly SLOW_RENDER_THRESHOLD = 100; // 100ms

  /**
   * Record a performance metric
   */
  recordMetric(
    operation: string,
    duration: number,
    userId?: string,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      userId,
      metadata
    };

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log slow operations
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      console.warn(`Slow operation detected: ${operation}`, {
        duration: `${duration}ms`,
        userId,
        metadata
      });
    }

    // Send to analytics service in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(metric);
    }
  }

  /**
   * Time a function execution
   */
  async timeOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.recordMetric(operation, duration, userId, {
        ...metadata,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric(operation, duration, userId, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Time a synchronous operation
   */
  timeSync<T>(
    operation: string,
    fn: () => T,
    userId?: string,
    metadata?: Record<string, any>
  ): T {
    const startTime = performance.now();
    
    try {
      const result = fn();
      const duration = performance.now() - startTime;
      
      this.recordMetric(operation, duration, userId, {
        ...metadata,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric(operation, duration, userId, {
        ...metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }

  /**
   * Record database query performance
   */
  recordQueryPerformance(performance: QueryPerformance): void {
    this.recordMetric(`query:${performance.queryType}`, performance.executionTime, undefined, {
      resultCount: performance.resultCount,
      cacheHit: performance.cacheHit,
      parameters: performance.parameters
    });
  }

  /**
   * Record component render performance
   */
  recordComponentPerformance(performance: ComponentPerformance): void {
    this.recordMetric(`render:${performance.componentName}`, performance.renderTime, undefined, {
      dataSize: performance.dataSize,
      reRenderCount: performance.reRenderCount
    });

    if (performance.renderTime > this.SLOW_RENDER_THRESHOLD) {
      console.warn(`Slow component render: ${performance.componentName}`, {
        renderTime: `${performance.renderTime}ms`,
        dataSize: performance.dataSize
      });
    }
  }

  /**
   * Get performance statistics
   */
  getStats(operation?: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    p95Duration: number;
    slowOperations: number;
    recentTrend: 'improving' | 'degrading' | 'stable';
  } {
    let filteredMetrics = this.metrics;
    
    if (operation) {
      filteredMetrics = this.metrics.filter(m => m.operation === operation);
    }

    if (filteredMetrics.length === 0) {
      return {
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        slowOperations: 0,
        recentTrend: 'stable'
      };
    }

    const durations = filteredMetrics.map(m => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / count;
    const minDuration = durations[0];
    const maxDuration = durations[count - 1];
    const p95Index = Math.floor(count * 0.95);
    const p95Duration = durations[p95Index] || maxDuration;
    const slowOperations = durations.filter(d => d > this.SLOW_QUERY_THRESHOLD).length;

    // Calculate trend (compare recent vs older metrics)
    const recentTrend = this.calculateTrend(filteredMetrics);

    return {
      count,
      avgDuration: Math.round(avgDuration * 100) / 100,
      minDuration: Math.round(minDuration * 100) / 100,
      maxDuration: Math.round(maxDuration * 100) / 100,
      p95Duration: Math.round(p95Duration * 100) / 100,
      slowOperations,
      recentTrend
    };
  }

  /**
   * Calculate performance trend
   */
  private calculateTrend(metrics: PerformanceMetric[]): 'improving' | 'degrading' | 'stable' {
    if (metrics.length < 10) return 'stable';

    const sortedMetrics = metrics.sort((a, b) => a.timestamp - b.timestamp);
    const midpoint = Math.floor(sortedMetrics.length / 2);
    
    const olderMetrics = sortedMetrics.slice(0, midpoint);
    const recentMetrics = sortedMetrics.slice(midpoint);

    const olderAvg = olderMetrics.reduce((sum, m) => sum + m.duration, 0) / olderMetrics.length;
    const recentAvg = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;

    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (percentChange > 10) return 'degrading';
    if (percentChange < -10) return 'improving';
    return 'stable';
  }

  /**
   * Get slow operations report
   */
  getSlowOperationsReport(limit: number = 10): Array<{
    operation: string;
    duration: number;
    timestamp: string;
    userId?: string;
    metadata?: Record<string, any>;
  }> {
    return this.metrics
      .filter(m => m.duration > this.SLOW_QUERY_THRESHOLD)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(m => ({
        operation: m.operation,
        duration: Math.round(m.duration * 100) / 100,
        timestamp: new Date(m.timestamp).toISOString(),
        userId: m.userId,
        metadata: m.metadata
      }));
  }

  /**
   * Get operations by type
   */
  getOperationTypes(): Array<{
    operation: string;
    count: number;
    avgDuration: number;
    totalDuration: number;
  }> {
    const operationMap = new Map<string, { count: number; totalDuration: number }>();

    this.metrics.forEach(metric => {
      const existing = operationMap.get(metric.operation) || { count: 0, totalDuration: 0 };
      operationMap.set(metric.operation, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + metric.duration
      });
    });

    return Array.from(operationMap.entries())
      .map(([operation, data]) => ({
        operation,
        count: data.count,
        avgDuration: Math.round((data.totalDuration / data.count) * 100) / 100,
        totalDuration: Math.round(data.totalDuration * 100) / 100
      }))
      .sort((a, b) => b.totalDuration - a.totalDuration);
  }

  /**
   * Clear old metrics
   */
  clearOldMetrics(olderThanMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - olderThanMs;
    const initialCount = this.metrics.length;
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    return initialCount - this.metrics.length;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Send metrics to analytics service
   */
  private async sendToAnalytics(metric: PerformanceMetric): Promise<void> {
    try {
      // Only send significant metrics to avoid spam
      if (metric.duration < 50 && !metric.metadata?.error) return;

      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'habits',
          ...metric
        })
      });
    } catch (error) {
      // Silently fail to avoid affecting user experience
      console.debug('Failed to send performance metric:', error);
    }
  }

  /**
   * Create a performance timer
   */
  createTimer(operation: string, userId?: string, metadata?: Record<string, any>) {
    const startTime = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        this.recordMetric(operation, duration, userId, metadata);
        return duration;
      },
      endWith: (additionalMetadata: Record<string, any>) => {
        const duration = performance.now() - startTime;
        this.recordMetric(operation, duration, userId, { ...metadata, ...additionalMetadata });
        return duration;
      }
    };
  }

  /**
   * Monitor memory usage
   */
  getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } | null {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return null;
    }

    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100, // MB
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024 * 100) / 100, // MB
      percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
    };
  }
}

// Create singleton instance
export const habitPerformanceMonitor = new HabitPerformanceMonitor();

// React hook for component performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const [renderCount, setRenderCount] = React.useState(0);
  
  React.useEffect(() => {
    setRenderCount(prev => prev + 1);
  });

  const recordRender = React.useCallback((dataSize?: number) => {
    const timer = habitPerformanceMonitor.createTimer(`render:${componentName}`, undefined, {
      dataSize,
      reRenderCount: renderCount
    });
    
    // Use setTimeout to measure after render completion
    setTimeout(() => {
      timer.end();
    }, 0);
  }, [componentName, renderCount]);

  return { recordRender, renderCount };
};

export default habitPerformanceMonitor;