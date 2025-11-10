// src/components/habits/HabitsAnalyticsDashboard.tsx - Main habits analytics dashboard
import React, { useState, useEffect, useMemo } from 'react';
import {
  LazyCompletionRateChart,
  LazyHeatmapCalendar,
  LazyContextSuccessRates,
  LazyStreakTimeline,
  LazyCrossHabitCorrelations,
  LazyPatternInsights,
  useAnalyticsPerformance,
  useAnalyticsDataPrefetch,
  preloadAnalyticsComponents
} from './analytics/LazyAnalyticsComponents';

interface Habit {
  id: string;
  name: string;
  category: string;
  type: 'build' | 'break' | 'maintain';
  measurement_type: 'boolean' | 'count' | 'duration';
  color: string;
  created_at: string;
}

interface HabitEntry {
  id: string;
  habit_id: string;
  value: number;
  date: string;
  effort?: number;
  mood?: number;
  energy_level?: number;
  location?: string;
  weather?: string;
  context_tags?: string[];
  duration_minutes?: number;
  completion_time?: string;
  notes?: string;
}

interface AnalyticsData {
  habits: Habit[];
  entries: HabitEntry[];
  dateRange: {
    start: string;
    end: string;
  };
  summary: {
    totalHabits: number;
    totalEntries: number;
    avgCompletionRate: number;
    longestStreak: number;
    mostConsistentHabit: string;
  };
}

export function HabitsAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'correlations' | 'insights'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  
  // Performance monitoring
  const { metrics, startTiming, endTiming } = useAnalyticsPerformance();
  
  // Data prefetching
  const { prefetchData, isPrefetching } = useAnalyticsDataPrefetch('user-id'); // Would get from auth context

  // Load data from page
  useEffect(() => {
    const loadStartTime = startTiming();
    
    try {
      const habitsScript = document.querySelector('script[data-habits]');
      const entriesScript = document.querySelector('script[data-entries]');
      
      if (habitsScript && entriesScript) {
        const habits: Habit[] = JSON.parse(habitsScript.textContent || '[]');
        const entries: HabitEntry[] = JSON.parse(entriesScript.textContent || '[]');
        
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
        startDate.setDate(startDate.getDate() - days);
        
        // Filter entries by date range
        const filteredEntries = entries.filter(entry => {
          const entryDate = new Date(entry.date);
          return entryDate >= startDate && entryDate <= endDate;
        });
        
        // Calculate summary statistics
        const totalEntries = filteredEntries.length;
        const successfulEntries = filteredEntries.filter(entry => entry.value === 1).length;
        const avgCompletionRate = totalEntries > 0 ? successfulEntries / totalEntries : 0;
        
        // Calculate longest streak across all habits
        const longestStreak = calculateLongestStreak(habits, filteredEntries);
        
        // Find most consistent habit
        const habitConsistency = habits.map(habit => {
          const habitEntries = filteredEntries.filter(e => e.habit_id === habit.id);
          const successRate = habitEntries.length > 0 ? 
            habitEntries.filter(e => e.value === 1).length / habitEntries.length : 0;
          return { habit: habit.name, rate: successRate };
        });
        const mostConsistent = habitConsistency.reduce((prev, current) => 
          current.rate > prev.rate ? current : prev, { habit: 'None', rate: 0 });
        
        setData({
          habits,
          entries: filteredEntries,
          dateRange: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          },
          summary: {
            totalHabits: habits.length,
            totalEntries,
            avgCompletionRate,
            longestStreak,
            mostConsistentHabit: mostConsistent.habit
          }
        });
        
        // Select all habits by default
        setSelectedHabits(habits.map(h => h.id));
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
      endTiming(loadStartTime, 'load');
    }
  }, [dateRange, startTiming, endTiming]);

  // Preload components when tab changes
  useEffect(() => {
    if (activeTab !== 'overview') {
      preloadAnalyticsComponents();
    }
  }, [activeTab]);

  // Prefetch data on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      prefetchData();
    }, 1000); // Delay to avoid blocking initial render

    return () => clearTimeout(timer);
  }, [prefetchData]);

  // Calculate longest streak across all habits
  const calculateLongestStreak = (habits: Habit[], entries: HabitEntry[]): number => {
    let maxStreak = 0;
    
    habits.forEach(habit => {
      const habitEntries = entries
        .filter(e => e.habit_id === habit.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let currentStreak = 0;
      let tempStreak = 0;
      
      habitEntries.forEach(entry => {
        if (entry.value === 1) {
          tempStreak++;
          currentStreak = Math.max(currentStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      });
      
      maxStreak = Math.max(maxStreak, currentStreak);
    });
    
    return maxStreak;
  };

  // Filter data based on selected habits
  const filteredData = useMemo(() => {
    if (!data) return null;
    
    return {
      ...data,
      habits: data.habits.filter(h => selectedHabits.includes(h.id)),
      entries: data.entries.filter(e => selectedHabits.includes(e.habit_id))
    };
  }, [data, selectedHabits]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full"></div>
        <span className="ml-3 text-text-secondary">Loading analytics...</span>
      </div>
    );
  }

  if (!data || data.habits.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
          </svg>
        </div>
        <h3 className="text-lg font-medium text-text-primary mb-2">No Analytics Data</h3>
        <p className="text-text-secondary mb-4">
          Start tracking habits to see analytics and insights here.
        </p>
        <a 
          href="/habits" 
          className="inline-flex items-center px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
        >
          Go to Habits
        </a>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'patterns', label: 'Patterns', icon: '🔍' },
    { id: 'correlations', label: 'Correlations', icon: '🔗' },
    { id: 'insights', label: 'Insights', icon: '💡' }
  ] as const;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Date Range Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-text-primary">Time Range:</label>
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>

        {/* Habit Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-text-primary">Habits:</label>
          <div className="relative">
            <button 
              className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary flex items-center space-x-2"
              onClick={() => {
                // Toggle dropdown (simplified for now)
                const isAllSelected = selectedHabits.length === data.habits.length;
                if (isAllSelected) {
                  setSelectedHabits([]);
                } else {
                  setSelectedHabits(data.habits.map(h => h.id));
                }
              }}
            >
              <span>
                {selectedHabits.length === data.habits.length 
                  ? 'All Habits' 
                  : `${selectedHabits.length} Selected`}
              </span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Total Habits</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">
                {data.summary.totalHabits}
              </p>
            </div>
            <div className="w-12 h-12 bg-accent-primary/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Completion Rate</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">
                {Math.round(data.summary.avgCompletionRate * 100)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-accent-success/10 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Longest Streak</p>
              <p className="text-2xl font-semibold text-text-primary mt-1">
                {data.summary.longestStreak}
              </p>
              <p className="text-sm text-text-muted mt-1">days</p>
            </div>
            <div className="w-12 h-12 bg-accent-warning/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🔥</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-muted">Most Consistent</p>
              <p className="text-lg font-semibold text-text-primary mt-1">
                {data.summary.mostConsistentHabit}
              </p>
            </div>
            <div className="w-12 h-12 bg-accent-purple/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏆</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-accent-primary text-accent-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary hover:border-border'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && filteredData && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LazyCompletionRateChart data={filteredData} />
              <LazyHeatmapCalendar data={filteredData} />
            </div>
            <LazyStreakTimeline data={filteredData} />
          </>
        )}

        {activeTab === 'patterns' && filteredData && (
          <>
            <LazyContextSuccessRates data={filteredData} />
            <LazyPatternInsights data={filteredData} />
          </>
        )}

        {activeTab === 'correlations' && filteredData && (
          <LazyCrossHabitCorrelations data={filteredData} />
        )}

        {activeTab === 'insights' && filteredData && (
          <LazyPatternInsights data={filteredData} showDetailed={true} />
        )}

        {/* Performance metrics (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-surface rounded-lg border border-border">
            <h4 className="text-sm font-medium text-text-primary mb-2">Performance Metrics</h4>
            <div className="grid grid-cols-3 gap-4 text-xs text-text-secondary">
              <div>Load Time: {metrics.loadTime.toFixed(2)}ms</div>
              <div>Render Time: {metrics.renderTime.toFixed(2)}ms</div>
              <div>Components: {metrics.componentCount}</div>
            </div>
            {isPrefetching && (
              <div className="mt-2 text-xs text-accent-primary">Prefetching data...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default HabitsAnalyticsDashboard;