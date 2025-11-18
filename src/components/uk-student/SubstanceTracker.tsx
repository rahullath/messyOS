// src/components/uk-student/SubstanceTracker.tsx
import React, { useState, useEffect } from 'react';

interface SubstanceTrackerProps {
  substanceType: 'vaping' | 'smoking';
  onTrack?: (count: number, notes?: string) => void;
  reductionGoal?: {
    target_reduction: number;
    timeframe_days: number;
  };
  trackingData?: Array<{
    count: number;
    tracked_at: string;
    notes?: string;
  }>;
}

export const SubstanceTracker: React.FC<SubstanceTrackerProps> = ({
  substanceType,
  onTrack,
  reductionGoal,
  trackingData = [],
}) => {
  const [count, setCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [targetReduction, setTargetReduction] = useState(50);
  const [timeframe, setTimeframe] = useState(30);

  const displayName = substanceType === 'vaping' ? 'Vaping' : 'Smoking';

  // Calculate statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayCount = trackingData.filter((d) => {
    const date = new Date(d.tracked_at);
    date.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  }).reduce((sum, d) => sum + d.count, 0);

  const weekCount = trackingData
    .filter((d) => {
      const date = new Date(d.tracked_at);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    })
    .reduce((sum, d) => sum + d.count, 0);

  const monthCount = trackingData
    .filter((d) => {
      const date = new Date(d.tracked_at);
      const monthAgo = new Date(today);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return date >= monthAgo;
    })
    .reduce((sum, d) => sum + d.count, 0);

  const handleTrack = () => {
    onTrack?.(count, notes || undefined);
    setCount(1);
    setNotes('');
    setShowForm(false);
  };

  const handleSetGoal = () => {
    // This would be handled by parent component
    setShowGoalForm(false);
  };

  // Calculate trend
  const lastWeekCount = trackingData
    .filter((d) => {
      const date = new Date(d.tracked_at);
      const twoWeeksAgo = new Date(today);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= twoWeeksAgo && date < weekAgo;
    })
    .reduce((sum, d) => sum + d.count, 0);

  const trend = lastWeekCount > 0 ? ((weekCount - lastWeekCount) / lastWeekCount) * 100 : 0;

  return (
    <div className="substance-tracker p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold">{displayName} Tracker</h2>
          <p className="text-gray-600">Track your usage and work towards reduction goals</p>
        </div>
        {reductionGoal && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Reduction Goal</p>
            <p className="text-lg font-bold text-blue-600">
              {reductionGoal.target_reduction}% in {reductionGoal.timeframe_days} days
            </p>
          </div>
        )}
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600 mb-1">Today</p>
          <p className="text-3xl font-bold text-blue-600">{todayCount}</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-gray-600 mb-1">This Week</p>
          <p className="text-3xl font-bold text-purple-600">{weekCount}</p>
          {trend !== 0 && (
            <p className={`text-sm mt-1 ${trend < 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend < 0 ? '↓' : '↑'} {Math.abs(Math.round(trend))}% vs last week
            </p>
          )}
        </div>
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-gray-600 mb-1">This Month</p>
          <p className="text-3xl font-bold text-green-600">{monthCount}</p>
        </div>
      </div>

      {/* Quick Track Button */}
      {!showForm && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="flex-grow px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
          >
            Log {displayName}
          </button>
          {!reductionGoal && (
            <button
              onClick={() => setShowGoalForm(true)}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
            >
              Set Goal
            </button>
          )}
        </div>
      )}

      {/* Track Form */}
      {showForm && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
          <h3 className="font-semibold mb-4">Log {displayName} Usage</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Count
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setCount(Math.max(1, count - 1))}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={count}
                  onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 px-3 py-2 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setCount(count + 1)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How are you feeling? Any triggers?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleTrack}
                className="flex-grow px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
              >
                Log Usage
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setCount(1);
                  setNotes('');
                }}
                className="flex-grow px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Goal Form */}
      {showGoalForm && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-6">
          <h3 className="font-semibold mb-4">Set Reduction Goal</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Reduction: {targetReduction}%
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="10"
                value={targetReduction}
                onChange={(e) => setTargetReduction(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeframe: {timeframe} days
              </label>
              <input
                type="range"
                min="7"
                max="90"
                step="7"
                value={timeframe}
                onChange={(e) => setTimeframe(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSetGoal}
                className="flex-grow px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold"
              >
                Set Goal
              </button>
              <button
                onClick={() => setShowGoalForm(false)}
                className="flex-grow px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {trackingData.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">Recent Activity</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {trackingData.slice(0, 10).map((entry, index) => (
              <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded border border-gray-200">
                <div>
                  <p className="font-medium">{entry.count}x {displayName}</p>
                  {entry.notes && <p className="text-sm text-gray-600">{entry.notes}</p>}
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(entry.tracked_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Encouragement */}
      <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
        <p className="text-sm text-green-800">
          💪 Every day you track is a step towards your goals. Keep going!
        </p>
      </div>
    </div>
  );
};
