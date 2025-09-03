// src/components/debug/AnalyticsDashboard.tsx - Analytics dashboard for user flow optimization
import React, { useState, useEffect } from 'react';
import { analytics } from '../../lib/analytics/tracking';

interface AnalyticsData {
  userFlow: {
    currentStep: string;
    completedSteps: string[];
    dropoffPoints: Array<{step: string, rate: number}>;
    conversionRate: number;
  };
  engagement: {
    pageViews: number;
    interactions: number;
    timeOnPage: number;
    bounceRate: number;
  };
  performance: {
    avgLoadTime: number;
    slowPages: string[];
    errorRate: number;
    mobileUsage: number;
  };
  realtime: {
    activeUsers: number;
    currentPage: string;
    recentEvents: Array<{event: string, timestamp: number}>;
  };
}

export function AnalyticsDashboard() {
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'flow' | 'engagement' | 'performance' | 'realtime'>('flow');

  // Simulate analytics data (in real app, this would come from your analytics service)
  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockData: AnalyticsData = {
        userFlow: {
          currentStep: 'dashboard',
          completedSteps: ['landing', 'waitlist', 'auth', 'onboarding'],
          dropoffPoints: [
            { step: 'waitlist_to_auth', rate: 0.15 },
            { step: 'auth_to_onboarding', rate: 0.08 },
            { step: 'onboarding_to_dashboard', rate: 0.05 }
          ],
          conversionRate: 0.72
        },
        engagement: {
          pageViews: 1247,
          interactions: 3891,
          timeOnPage: 142000, // ms
          bounceRate: 0.23
        },
        performance: {
          avgLoadTime: 1850, // ms
          slowPages: ['/dashboard', '/wallet'],
          errorRate: 0.02,
          mobileUsage: 0.68
        },
        realtime: {
          activeUsers: 23,
          currentPage: window.location.pathname,
          recentEvents: [
            { event: 'page_view', timestamp: Date.now() - 1000 },
            { event: 'button_click', timestamp: Date.now() - 3000 },
            { event: 'form_submit', timestamp: Date.now() - 5000 }
          ]
        }
      };
      
      setData(mockData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible) {
      loadAnalyticsData();
      const interval = setInterval(loadAnalyticsData, 10000); // Update every 10s
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  // Only show in development or when explicitly enabled
  const shouldShow = process.env.NODE_ENV === 'development' || 
                    localStorage.getItem('debug-analytics') === 'true';

  if (!shouldShow) return null;

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  const getDropoffColor = (rate: number) => {
    if (rate < 0.05) return 'text-green-400';
    if (rate < 0.15) return 'text-yellow-400';
    return 'text-red-400';
  };

  const tabs = [
    { id: 'flow', label: 'User Flow', icon: '🔄' },
    { id: 'engagement', label: 'Engagement', icon: '📊' },
    { id: 'performance', label: 'Performance', icon: '⚡' },
    { id: 'realtime', label: 'Real-time', icon: '🔴' }
  ] as const;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-16 right-4 z-50 bg-purple-600 border border-purple-500 text-white p-2 rounded-lg shadow-lg hover:bg-purple-700 transition-colors"
        title="Analytics Dashboard"
      >
        📈
      </button>

      {/* Analytics Panel */}
      {isVisible && (
        <div className="fixed bottom-28 right-4 z-50 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg shadow-xl w-96 max-h-[500px] overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Analytics Dashboard</h3>
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-4 bg-slate-700/50 rounded-lg p-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex-1 text-xs py-2 px-2 rounded transition-colors ${
                    selectedTab === tab.id
                      ? 'bg-slate-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <span className="block">{tab.icon}</span>
                  <span className="block mt-1">{tab.label}</span>
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-gray-600 border-t-purple-400 rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-400">Loading analytics...</p>
              </div>
            ) : data ? (
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {/* User Flow Tab */}
                {selectedTab === 'flow' && (
                  <div className="space-y-3">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-white mb-2">Conversion Funnel</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-300">Overall Conversion</span>
                          <span className="text-sm font-bold text-green-400">
                            {formatPercentage(data.userFlow.conversionRate)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                            style={{ width: `${data.userFlow.conversionRate * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-white mb-2">Drop-off Points</h4>
                      <div className="space-y-2">
                        {data.userFlow.dropoffPoints.map((point, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <span className="text-xs text-gray-300">{point.step.replace('_', ' → ')}</span>
                            <span className={`text-xs font-medium ${getDropoffColor(point.rate)}`}>
                              {formatPercentage(point.rate)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-white mb-2">Current Journey</h4>
                      <div className="flex items-center space-x-2 text-xs">
                        {data.userFlow.completedSteps.map((step, index) => (
                          <React.Fragment key={step}>
                            <span className="text-green-400">✓ {step}</span>
                            {index < data.userFlow.completedSteps.length - 1 && (
                              <span className="text-gray-500">→</span>
                            )}
                          </React.Fragment>
                        ))}
                        <span className="text-gray-500">→</span>
                        <span className="text-cyan-400 font-medium">{data.userFlow.currentStep}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Engagement Tab */}
                {selectedTab === 'engagement' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-xs text-gray-300">Page Views</div>
                        <div className="text-lg font-bold text-cyan-400">{data.engagement.pageViews.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <div className="text-xs text-gray-300">Interactions</div>
                        <div className="text-lg font-bold text-cyan-400">{data.engagement.interactions.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-white mb-2">Engagement Metrics</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Avg. Time on Page</span>
                          <span className="text-cyan-400">{formatDuration(data.engagement.timeOnPage)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Bounce Rate</span>
                          <span className={`${data.engagement.bounceRate < 0.3 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {formatPercentage(data.engagement.bounceRate)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Interactions/Visit</span>
                          <span className="text-cyan-400">
                            {(data.engagement.interactions / data.engagement.pageViews).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Tab */}
                {selectedTab === 'performance' && (
                  <div className="space-y-3">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-white mb-2">Performance Overview</h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Avg. Load Time</span>
                          <span className={`${data.performance.avgLoadTime < 2000 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {data.performance.avgLoadTime}ms
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Error Rate</span>
                          <span className={`${data.performance.errorRate < 0.05 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatPercentage(data.performance.errorRate)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Mobile Usage</span>
                          <span className="text-cyan-400">{formatPercentage(data.performance.mobileUsage)}</span>
                        </div>
                      </div>
                    </div>

                    {data.performance.slowPages.length > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-white mb-2">Slow Pages</h4>
                        <div className="space-y-1">
                          {data.performance.slowPages.map((page, index) => (
                            <div key={index} className="text-xs text-yellow-400">⚠ {page}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Real-time Tab */}
                {selectedTab === 'realtime' && (
                  <div className="space-y-3">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-white">Active Users</h4>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-lg font-bold text-green-400">{data.realtime.activeUsers}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-300">
                        Current page: <span className="text-cyan-400">{data.realtime.currentPage}</span>
                      </div>
                    </div>

                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-white mb-2">Recent Events</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {data.realtime.recentEvents.map((event, index) => (
                          <div key={index} className="flex justify-between items-center text-xs">
                            <span className="text-gray-300">{event.event.replace('_', ' ')}</span>
                            <span className="text-gray-500">
                              {Math.round((Date.now() - event.timestamp) / 1000)}s ago
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-400">No analytics data available</p>
                <button
                  onClick={loadAnalyticsData}
                  className="mt-2 bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 px-3 rounded transition-colors"
                >
                  Load Data
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2 mt-4 pt-4 border-t border-slate-600">
              <button
                onClick={loadAnalyticsData}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 px-3 rounded transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={() => {
                  console.log('Analytics Summary:', analytics.getSummary());
                  console.log('Current Analytics Data:', data);
                }}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white text-xs py-2 px-3 rounded transition-colors"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Hook to enable analytics dashboard
export function useAnalyticsDashboard() {
  useEffect(() => {
    // Enable analytics dashboard in development
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('debug-analytics', 'true');
    }

    // Track dashboard usage
    analytics.trackEngagement('analytics_dashboard', 'enabled');
  }, []);
}