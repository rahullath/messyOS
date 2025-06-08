import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface HabitData {
  name: string;
  current: number;
  best: number;
  total: number;
  category: string;
  completionRate: number;
  daysTracked: number;
  totalEntries: number;
}

interface AnalyticsProps {
  data?: {
    habits: HabitData[];
    stats: {
      totalHabits: number;
      totalEntries: number;
      avgCompletionRate: number;
      perfectHabits: number;
      habitsWithIssues: number;
    };
    categories: Array<{
      name: string;
      count: number;
      avgStreak: number;
      completionRate: number;
    }>;
    issues: Array<{
      name: string;
      issue: string;
      value: string;
    }>;
  };
}

export default function AdvancedAnalyticsDashboard({ data }: AnalyticsProps) {
  const [timeRange, setTimeRange] = useState('90d');

  // Use real data or fallback to demo data
  const habits = data?.habits || [
    { name: "Quit Valorant", current: 117, best: 117, total: 117, category: "Focus", completionRate: 100, daysTracked: 117, totalEntries: 117 },
    { name: "Vaping Free", current: 114, best: 114, total: 114, category: "Health", completionRate: 100, daysTracked: 114, totalEntries: 114 },
    { name: "Wake Up Early", current: 112, best: 112, total: 112, category: "Discipline", completionRate: 100, daysTracked: 112, totalEntries: 112 },
    { name: "Daily Walks", current: 110, best: 110, total: 110, category: "Fitness", completionRate: 100, daysTracked: 110, totalEntries: 110 }
  ];

  const stats = data?.stats || { 
    totalHabits: 10, 
    totalEntries: 1000, 
    avgCompletionRate: 100, 
    perfectHabits: 7, 
    habitsWithIssues: 0 
  };

  const categories = data?.categories || [
    { name: "Health", count: 3, avgStreak: 100, completionRate: 100 },
    { name: "Fitness", count: 2, avgStreak: 90, completionRate: 98 },
    { name: "Productivity", count: 3, avgStreak: 85, completionRate: 95 }
  ];

  const issues = data?.issues || [];

  // Calculate analytics from real data
  const totalStreakDays = habits.reduce((sum, h) => sum + h.current, 0);
  const avgStreakLength = habits.length > 0 ? Math.round(totalStreakDays / habits.length) : 0;
  const dataQualityScore = Math.round((stats.avgCompletionRate + (stats.totalEntries > 100 ? 100 : stats.totalEntries)) / 2);

  // Identify optimization opportunities
  const streakVariance = habits.length > 1 ? Math.max(...habits.map(h => h.current)) - Math.min(...habits.map(h => h.current)) : 0;
  const lowPerformers = habits.filter(h => h.completionRate < 95);
  const dataGaps = habits.filter(h => h.totalEntries < 30);

  // Color mapping for categories
  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      "Health": "#10b981",
      "Fitness": "#3b82f6", 
      "Focus": "#8b5cf6",
      "Career": "#f59e0b",
      "Discipline": "#ef4444",
      "Self Care": "#06b6d4",
      "Education": "#84cc16"
    };
    return colors[category] || "#6b7280";
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Life Analytics</h1>
          <p className="text-gray-400">Deep insights into your consistency journey</p>
        </div>
        <div className="flex space-x-2">
          {['30d', '90d', '1y', 'all'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-green-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-300">Perfect Habits</p>
              <p className="text-3xl font-bold text-green-400">{stats.perfectHabits}/{stats.totalHabits}</p>
              <p className="text-sm text-green-200 mt-1">90+ day streaks</p>
            </div>
            <div className="text-4xl">🏆</div>
          </div>
        </div>

        <div className="bg-gray-800 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-300">Data Quality</p>
              <p className="text-3xl font-bold text-blue-400">{dataQualityScore}%</p>
              <p className="text-sm text-blue-200 mt-1">completeness</p>
            </div>
            <div className="text-4xl">📊</div>
          </div>
        </div>

        <div className="bg-gray-800 border border-purple-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-300">Total Entries</p>
              <p className="text-3xl font-bold text-purple-400">{stats.totalEntries}</p>
              <p className="text-sm text-purple-200 mt-1">logged</p>
            </div>
            <div className="text-4xl">📝</div>
          </div>
        </div>

        <div className="bg-gray-800 border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-300">Issues Found</p>
              <p className="text-3xl font-bold text-yellow-400">{stats.habitsWithIssues}</p>
              <p className="text-sm text-yellow-200 mt-1">need attention</p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Streak Lengths */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Habit Streak Lengths</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={habits} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="name" 
                stroke="#9CA3AF" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="current" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Performance */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Category Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categories}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="avgStreak" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* System Analysis */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">System Analysis</h3>
          <div className="space-y-4">
            <div className="p-4 bg-gray-700 border border-gray-600 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xl">📊</span>
                <span className="font-semibold text-white">Streak Variance Analysis</span>
              </div>
              <p className="text-sm text-gray-300">
                {streakVariance} day variance between highest and lowest performing habits. 
                {streakVariance > 30 ? ' High variance suggests uneven habit implementation or different start dates.' : ' Low variance indicates consistent habit formation patterns.'}
              </p>
            </div>

            <div className="p-4 bg-gray-700 border border-gray-600 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xl">🔍</span>
                <span className="font-semibold text-white">Data Completeness</span>
              </div>
              <p className="text-sm text-gray-300">
                {stats.avgCompletionRate}% overall completion rate across {stats.totalEntries} entries. 
                {dataGaps.length > 0 ? ` ${dataGaps.length} habits have insufficient data (<30 entries).` : ' All habits have sufficient data density.'}
              </p>
            </div>

            {lowPerformers.length > 0 && (
              <div className="p-4 bg-gray-700 border border-gray-600 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xl">⚠️</span>
                  <span className="font-semibold text-white">Performance Issues</span>
                </div>
                <p className="text-sm text-gray-300">
                  {lowPerformers.length} habits below 95% completion rate: {lowPerformers.map(h => h.name).join(', ')}. 
                  Investigate logging consistency or habit difficulty.
                </p>
              </div>
            )}

            <div className="p-4 bg-gray-700 border border-gray-600 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xl">📈</span>
                <span className="font-semibold text-white">Optimization Potential</span>
              </div>
              <p className="text-sm text-gray-300">
                Current binary logging (success/fail) limits analysis depth. 
                Consider: completion time tracking, effort scoring (1-5), external factor correlation, habit dependency mapping.
              </p>
            </div>
          </div>
        </div>

        {/* AI Optimization Engine */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">🤖 Optimization Engine</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-white mb-2">System Improvements</h4>
              <ul className="text-sm space-y-1 text-gray-300">
                <li>• Add habit completion timestamps for optimal timing analysis</li>
                <li>• Implement effort scoring (1-5) to identify high-cost habits</li>
                <li>• Track habit dependencies (morning routine → productivity habits)</li>
                <li>• Add environmental context (location, weather, social)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-white mb-2">Data Quality Fixes</h4>
              <ul className="text-sm space-y-1 text-gray-300">
                {dataGaps.length > 0 && <li>• Fill data gaps in {dataGaps.length} habits with insufficient entries</li>}
                {lowPerformers.length > 0 && <li>• Investigate {lowPerformers.length} habits with &lt;95% completion rate</li>}
                <li>• Add failure/skip logging to enable true pattern analysis</li>
                <li>• Implement habit load balancing to prevent burnout</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xl">⚡</span>
              <span className="font-medium text-yellow-400">Priority Action Items</span>
            </div>
            <div className="text-sm text-gray-300 space-y-1">
              {issues.length > 0 && (
                <p>• Address {issues.length} habits flagged for attention: {issues.slice(0, 3).map(i => i.name).join(', ')}</p>
              )}
              <p>• Implement contextual logging to move beyond binary success/failure tracking</p>
              <p>• Add habit timing optimization to identify peak performance windows</p>
              <p>• Build predictive models for habit difficulty and completion probability</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}