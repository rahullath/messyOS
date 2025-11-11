import React, { useState, useEffect } from 'react';
import { TimeTrackingService } from '../../lib/task-management/time-tracking-service';

interface ProductivityAnalyticsProps {
  userId: string;
}

interface ProductivityData {
  totalSessions: number;
  totalTimeSpent: number;
  averageProductivity: number;
  averageDifficulty: number;
  averageEnergy: number;
  bestPerformanceTimes: Array<{
    hour: number;
    avgProductivity: number;
    sessionCount: number;
  }>;
  commonDistractions: Array<{
    name: string;
    frequency: number;
    percentage: number;
  }>;
  hourlyProductivity: Array<{
    hour: number;
    avgProductivity: number;
    sessionCount: number;
  }>;
  dailyProductivity: Array<{
    day: number;
    avgProductivity: number;
    sessionCount: number;
  }>;
}

interface TimeReport {
  reportType: string;
  totalSessions: number;
  totalTimeSpent: number;
  completedSessions: number;
  averageProductivity: number;
  categoryBreakdown: Array<{
    category: string;
    timeSpent: number;
    sessionCount: number;
    averageProductivity: number;
    percentage: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    timeSpent: number;
    sessionCount: number;
    averageProductivity: number;
  }>;
}

export default function ProductivityAnalytics({ userId }: ProductivityAnalyticsProps) {
  const [productivityData, setProductivityData] = useState<ProductivityData | null>(null);
  const [timeReport, setTimeReport] = useState<TimeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    fetchAnalytics();
  }, [userId, reportType]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [productivity, report] = await Promise.all([
        TimeTrackingService.analyzeProductivityPatterns(userId),
        TimeTrackingService.generateTimeReports(userId, reportType)
      ]);

      setProductivityData(productivity);
      setTimeReport(report);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  };

  const getDayName = (day: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-red-800">{error}</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!productivityData || !timeReport) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p>No productivity data available yet</p>
        <p className="text-sm">Complete some time tracking sessions to see insights!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Productivity Analytics</h2>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Report Period:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as typeof reportType)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Today</option>
            <option value="weekly">Last 7 Days</option>
            <option value="monthly">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Time</p>
              <p className="text-2xl font-semibold text-white">{formatTime(timeReport.totalTimeSpent)}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sessions</p>
              <p className="text-2xl font-semibold text-white">{timeReport.totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Productivity</p>
              <p className="text-2xl font-semibold text-white">{productivityData.averageProductivity}/10</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Energy</p>
              <p className="text-2xl font-semibold text-white">{productivityData.averageEnergy}/10</p>
            </div>
          </div>
        </div>
      </div>

      {/* Best Performance Times */}
      {productivityData.bestPerformanceTimes.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">🚀 Best Performance Times</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {productivityData.bestPerformanceTimes.map((time, index) => (
              <div key={time.hour} className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-green-800">{formatHour(time.hour)}</p>
                    <p className="text-sm text-green-600">Productivity: {time.avgProductivity}/10</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl">#{index + 1}</p>
                    <p className="text-xs text-gray-500">{time.sessionCount} sessions</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {timeReport.categoryBreakdown.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">📊 Time by Category</h3>
          <div className="space-y-3">
            {timeReport.categoryBreakdown.map((category) => (
              <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-white">{category.category}</h4>
                    <span className="text-sm text-gray-500">{category.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${category.percentage}%` }}
                    ></div>
                  </div>
                </div>
                <div className="ml-4 text-right">
                  <p className="text-sm font-medium text-white">{formatTime(category.timeSpent)}</p>
                  <p className="text-xs text-gray-500">
                    {category.sessionCount} sessions • {category.averageProductivity}/10 avg
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common Distractions */}
      {productivityData.commonDistractions.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">⚠️ Common Distractions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {productivityData.commonDistractions.map((distraction) => (
              <div key={distraction.name} className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-red-800 capitalize">{distraction.name}</h4>
                  <span className="text-sm bg-red-200 text-red-800 px-2 py-1 rounded-full">
                    {distraction.percentage}%
                  </span>
                </div>
                <p className="text-sm text-red-600 mt-1">{distraction.frequency} times</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Breakdown Chart */}
      {timeReport.dailyBreakdown.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">📈 Daily Activity</h3>
          <div className="space-y-2">
            {timeReport.dailyBreakdown.map((day) => (
              <div key={day.date} className="flex items-center space-x-4 p-3 hover:bg-gray-50 rounded-lg">
                <div className="w-20 text-sm text-gray-600">
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">
                      {formatTime(day.timeSpent)} • {day.sessionCount} sessions
                    </span>
                    <span className="text-sm text-gray-500">
                      {day.averageProductivity}/10 productivity
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        day.averageProductivity >= 7 ? 'bg-green-500' : 
                        day.averageProductivity >= 5 ? 'bg-yellow-500' : 
                        'bg-red-500'
                      }`}
                      style={{ width: `${(day.averageProductivity / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights and Recommendations */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Insights & Recommendations</h3>
        <div className="space-y-3 text-sm">
          {productivityData.bestPerformanceTimes.length > 0 && (
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-blue-800">
                Your most productive time is around <strong>{formatHour(productivityData.bestPerformanceTimes[0].hour)}</strong>. 
                Try scheduling your most important tasks during this time.
              </p>
            </div>
          )}
          
          {productivityData.averageProductivity < 6 && (
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-blue-800">
                Your average productivity is below 6/10. Consider taking more breaks or adjusting your work environment.
              </p>
            </div>
          )}

          {productivityData.commonDistractions.length > 0 && (
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-blue-800">
                <strong>{productivityData.commonDistractions[0].name}</strong> is your most common distraction. 
                Consider using focus tools or techniques to minimize this.
              </p>
            </div>
          )}

          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-blue-800">
              You've completed <strong>{timeReport.completedSessions}</strong> successful work sessions. 
              Keep building this habit!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}